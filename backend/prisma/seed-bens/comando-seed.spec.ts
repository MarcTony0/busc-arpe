import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { Prisma, PrismaClient } from '../../src/generated/prisma/client';
import { seedConfig } from '../seed-config';
import {
  executarComandoSeedBens,
  type ClienteComandoSeedBens,
  type LoggerComandoSeedBens,
} from './comando-seed';
import type { TransacaoSeedBens } from './persistidor';

type PrismaClientCompatível = PrismaClient extends ClienteComandoSeedBens
  ? true
  : false;
const prismaClientCompatível: PrismaClientCompatível = true;
void prismaClientCompatível;

const municipio = {
  id: 12,
  nome: 'Abreu e Lima',
  nome_normalizado: 'abreu e lima',
};

describe('executarComandoSeedBens', () => {
  let diretorioTemporario: string;

  beforeEach(async () => {
    diretorioTemporario = await mkdtemp(
      path.join(os.tmpdir(), 'buscarpe-seed-comando-'),
    );
  });

  afterEach(async () => {
    await rm(diretorioTemporario, { recursive: true, force: true });
  });

  it('consulta o domínio, persiste payloads e registra conferência sem expor valores da planilha', async () => {
    const arquivo = path.join(diretorioTemporario, 'bens.csv');
    const cabecalhos = [
      ...Object.values(seedConfig.colunas),
      ...seedConfig.colunasDadosComplementaresPai,
      'FABRICANTE',
    ];
    const valores = [
      '7695',
      'Motor',
      'ABR-EAT-E-001',
      'EEAT Bela Vista',
      'Abreu e Lima',
      'Rua Bela Vista',
      'latitude inválida e sensível',
      '-34,9',
      'Operando',
      'ATIVO-001',
      'EEAT Bela Vista',
      'Recife',
      'Sede',
      'Pontual',
      'Fabricante A',
    ];
    await writeFile(
      arquivo,
      `${cabecalhos.join(';')}\n${valores.join(';')}\n`,
      'utf8',
    );

    const operacoes: Prisma.BemUpsertArgs[] = [];
    const mensagensInfo: string[] = [];
    const mensagensAviso: string[] = [];
    let argumentosConsulta: Prisma.MunicipioFindManyArgs | undefined;

    const cliente: ClienteComandoSeedBens = {
      municipio: {
        async findMany(args) {
          argumentosConsulta = args;
          return [municipio];
        },
      },
      async $transaction<T>(
        operacao: (transacao: TransacaoSeedBens) => Promise<T>,
      ): Promise<T> {
        const transacao = {
          bem: {
            async upsert(args: Prisma.BemUpsertArgs): Promise<unknown> {
              operacoes.push(args);
              return {};
            },
          },
        };
        return operacao(transacao);
      },
    };
    const logger: LoggerComandoSeedBens = {
      info: (mensagem) => mensagensInfo.push(mensagem),
      warn: (mensagem) => mensagensAviso.push(mensagem),
    };

    const resultado = await executarComandoSeedBens(arquivo, cliente, logger);

    expect(argumentosConsulta).toEqual({
      select: { id: true, nome: true, nome_normalizado: true },
    });
    expect(operacoes.map((operacao) => operacao.where.codigo_unico)).toEqual([
      'ABR-EAT-E-001',
      '7695',
    ]);
    expect(resultado).toEqual({
      lotesConcluidos: 1,
      instalacoesProcessadas: 1,
      bensPaisProcessados: 1,
      bensFilhosProcessados: 1,
      linhasLidas: 1,
      avisosLeitura: 1,
      avisosAgrupamento: 1,
      instalacoesPendentesMunicipio: 0,
      linhasPendentesMunicipio: 0,
      arquivoRelatorioPendencias: null,
    });
    expect(mensagensInfo).toHaveLength(1);
    expect(mensagensInfo[0]).toContain(
      'Conferência do seed de bens concluída.',
    );
    expect(mensagensAviso).toHaveLength(2);
    expect(mensagensAviso[0]).toContain('Valor não numérico');
    expect(mensagensAviso[0]).not.toContain('latitude inválida e sensível');
    expect(mensagensAviso[1]).toContain(
      'Nenhum equipamento do grupo possui latitude e longitude válidas',
    );
  });

  it('persiste somente instalações associadas e gera relatório das linhas adiadas', async () => {
    const arquivo = path.join(diretorioTemporario, 'bens.csv');
    const cabecalhos = [
      ...Object.values(seedConfig.colunas),
      ...seedConfig.colunasDadosComplementaresPai,
    ];
    const linhas = [
      [
        '7695',
        'Motor válido',
        'ABR-EAT-E-001',
        'EEAT Bela Vista',
        'Abreu e Lima',
        'Rua Bela Vista',
        '-7,9',
        '-34,9',
        'Operando',
        'ATIVO-001',
        'EEAT Bela Vista',
        'Recife',
        'Sede',
        'Pontual',
      ],
      [
        '7696',
        'Motor pendente',
        'ABR-EAT-E-002',
        'EEAT Sem Município',
        'N/I',
        'Rua A',
        '-7,9',
        '-34,9',
        'Operando',
        'ATIVO-002',
        'EEAT Sem Município',
        'Recife',
        'Sede',
        'Pontual',
      ],
    ];
    await writeFile(
      arquivo,
      [cabecalhos, ...linhas].map((linha) => linha.join(';')).join('\n'),
      'utf8',
    );

    const operacoes: Prisma.BemUpsertArgs[] = [];
    const mensagensAviso: string[] = [];
    const cliente: ClienteComandoSeedBens = {
      municipio: {
        async findMany() {
          return [municipio];
        },
      },
      async $transaction<T>(
        operacao: (transacao: TransacaoSeedBens) => Promise<T>,
      ): Promise<T> {
        return operacao({
          bem: {
            async upsert(args: Prisma.BemUpsertArgs): Promise<unknown> {
              operacoes.push(args);
              return {};
            },
          },
        });
      },
    };
    const logger: LoggerComandoSeedBens = {
      info: () => undefined,
      warn: (mensagem) => mensagensAviso.push(mensagem),
    };

    const resultado = await executarComandoSeedBens(arquivo, cliente, logger);

    expect(operacoes.map((operacao) => operacao.where.codigo_unico)).toEqual([
      'ABR-EAT-E-001',
      '7695',
    ]);
    expect(resultado).toMatchObject({
      instalacoesProcessadas: 1,
      bensPaisProcessados: 1,
      bensFilhosProcessados: 1,
      instalacoesPendentesMunicipio: 1,
      linhasPendentesMunicipio: 1,
    });
    expect(resultado.arquivoRelatorioPendencias).not.toBeNull();
    if (resultado.arquivoRelatorioPendencias === null) {
      throw new Error('O relatório de pendências deveria ter sido gerado.');
    }

    const relatorio = await readFile(
      resultado.arquivoRelatorioPendencias,
      'utf8',
    );
    expect(relatorio).toContain('"ABR-EAT-E-002";"3";"N/I"');
    expect(relatorio).toContain(
      'Município não encontrado na tabela de domínio.',
    );
    expect(relatorio).not.toContain('Motor pendente');
    expect(mensagensAviso[0]).toContain('Relatório de pendências');
  });

  it('propaga erro de consulta ao domínio e não inicia persistência', async () => {
    let transacoes = 0;
    const cliente: ClienteComandoSeedBens = {
      municipio: {
        async findMany(): Promise<(typeof municipio)[]> {
          throw new Error('Consulta de municípios falhou.');
        },
      },
      async $transaction<T>(
        operacao: (transacao: TransacaoSeedBens) => Promise<T>,
      ): Promise<T> {
        transacoes++;
        return operacao({
          bem: {
            async upsert(): Promise<unknown> {
              return {};
            },
          },
        });
      },
    };
    const logger: LoggerComandoSeedBens = {
      info: () => undefined,
      warn: () => undefined,
    };

    await expect(
      executarComandoSeedBens('arquivo.csv', cliente, logger),
    ).rejects.toThrow('Consulta de municípios falhou.');
    expect(transacoes).toBe(0);
  });
});
