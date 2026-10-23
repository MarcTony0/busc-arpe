import { describe, expect, it } from '@jest/globals';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { SituacaoBem, TipoSistema } from '../../generated/prisma/enums';
import type { PayloadGrupoBem } from './montador-payloads';
import {
  persistirPayloadsBem,
  type ClienteTransacionalSeedBens,
  type TransacaoSeedBens,
} from './persistidor';

type PrismaClientCompatível = PrismaClient extends ClienteTransacionalSeedBens
  ? true
  : false;
const prismaClientCompatível: PrismaClientCompatível = true;
void prismaClientCompatível;

function criarPayload(
  codigoPai: string,
  codigosFilhos: string[],
): PayloadGrupoBem {
  const pai: Prisma.BemCreateInput = {
    codigo_unico: codigoPai,
    nome: `Instalação ${codigoPai}`,
    municipio: { connect: { id: 1 } },
    categoria: 'EAT',
    tipo_sistema: TipoSistema.SAA,
    situacao: SituacaoBem.OPERANDO,
    is_pai: true,
    dados_complementares: {},
    busca_texto: `instalacao ${codigoPai.toLowerCase()}`,
  };

  return {
    pai,
    filhos: codigosFilhos.map((codigoFilho) => ({
      codigo_unico: codigoFilho,
      nome: `Equipamento ${codigoFilho}`,
      municipio: { connect: { id: 1 } },
      categoria: 'EAT',
      tipo_sistema: TipoSistema.SAA,
      situacao: SituacaoBem.OPERANDO,
      is_pai: false,
      dados_complementares: {},
      busca_texto: `equipamento ${codigoFilho}`,
      bem_pai: { connect: { codigo_unico: codigoPai } },
    })),
  };
}

function criarClienteMock(
  falharNoUpsert?: (args: Prisma.BemUpsertArgs) => boolean,
): {
  cliente: ClienteTransacionalSeedBens;
  operacoes: Prisma.BemUpsertArgs[];
  transacoes: number;
  transacoesRevertidas: number;
} {
  const operacoes: Prisma.BemUpsertArgs[] = [];
  let transacoes = 0;
  let transacoesRevertidas = 0;

  const cliente: ClienteTransacionalSeedBens = {
    async $transaction<T>(
      operacao: (transacao: TransacaoSeedBens) => Promise<T>,
    ): Promise<T> {
      transacoes++;
      const operacoesDoLote: Prisma.BemUpsertArgs[] = [];
      const transacao = {
        bem: {
          async upsert(args: Prisma.BemUpsertArgs): Promise<unknown> {
            if (falharNoUpsert?.(args)) {
              throw new Error('Falha simulada de upsert.');
            }
            operacoesDoLote.push(args);
            return {};
          },
        },
      };

      try {
        const resultado = await operacao(transacao);
        operacoes.push(...operacoesDoLote);
        return resultado;
      } catch (erro) {
        transacoesRevertidas++;
        throw erro;
      }
    },
  };

  return {
    cliente,
    operacoes,
    get transacoes() {
      return transacoes;
    },
    get transacoesRevertidas() {
      return transacoesRevertidas;
    },
  };
}

describe('persistirPayloadsBem', () => {
  it('faz upsert do pai antes dos filhos dentro de uma transação por lote', async () => {
    const mock = criarClienteMock();
    const payloads = [
      criarPayload('INST-001', ['BEM-001', 'BEM-002']),
      criarPayload('INST-002', ['BEM-003']),
    ];

    const resultado = await persistirPayloadsBem(mock.cliente, payloads, {
      tamanhoLote: 2,
    });

    expect(mock.transacoes).toBe(1);
    expect(
      mock.operacoes.map((operacao) => operacao.where.codigo_unico),
    ).toEqual(['INST-001', 'BEM-001', 'BEM-002', 'INST-002', 'BEM-003']);
    expect(mock.operacoes[0]?.create).toMatchObject({
      codigo_unico: 'INST-001',
      is_pai: true,
    });
    expect(mock.operacoes[1]?.create).toMatchObject({
      codigo_unico: 'BEM-001',
      is_pai: false,
      bem_pai: { connect: { codigo_unico: 'INST-001' } },
    });
    expect(mock.operacoes[0]?.update).not.toHaveProperty('codigo_unico');
    expect(resultado).toEqual({
      lotesConcluidos: 1,
      instalacoesProcessadas: 2,
      bensPaisProcessados: 2,
      bensFilhosProcessados: 3,
    });
  });

  it('divide instalações em transações e contabiliza somente lotes confirmados', async () => {
    const mock = criarClienteMock();
    const payloads = [
      criarPayload('INST-001', ['BEM-001']),
      criarPayload('INST-002', ['BEM-002']),
      criarPayload('INST-003', ['BEM-003']),
    ];

    const resultado = await persistirPayloadsBem(mock.cliente, payloads, {
      tamanhoLote: 2,
    });

    expect(mock.transacoes).toBe(2);
    expect(resultado).toEqual({
      lotesConcluidos: 2,
      instalacoesProcessadas: 3,
      bensPaisProcessados: 3,
      bensFilhosProcessados: 3,
    });
  });

  it('falha explicitamente e interrompe ao encontrar erro no lote', async () => {
    const mock = criarClienteMock(
      (args) => args.where.codigo_unico === 'BEM-001',
    );
    const payloads = [
      criarPayload('INST-001', ['BEM-001']),
      criarPayload('INST-002', ['BEM-002']),
    ];

    await expect(
      persistirPayloadsBem(mock.cliente, payloads, { tamanhoLote: 1 }),
    ).rejects.toMatchObject({
      message:
        'Falha ao persistir o lote 1 de 2; a transação do lote foi revertida.',
      cause: new Error('Falha simulada de upsert.'),
    });
    expect(mock.transacoes).toBe(1);
    expect(mock.transacoesRevertidas).toBe(1);
    expect(mock.operacoes).toEqual([]);
  });

  it('rejeita tamanhos de lote inválidos sem iniciar transações', async () => {
    const mock = criarClienteMock();

    await expect(
      persistirPayloadsBem(mock.cliente, [], { tamanhoLote: 0 }),
    ).rejects.toThrow('O tamanho do lote deve ser um inteiro maior que zero.');
    expect(mock.transacoes).toBe(0);
  });

  it('não abre transação para uma lista vazia', async () => {
    const mock = criarClienteMock();

    const resultado = await persistirPayloadsBem(mock.cliente, []);

    expect(mock.transacoes).toBe(0);
    expect(resultado).toEqual({
      lotesConcluidos: 0,
      instalacoesProcessadas: 0,
      bensPaisProcessados: 0,
      bensFilhosProcessados: 0,
    });
  });
});
