import type { Prisma } from '../../src/generated/prisma/client';
import type { PayloadGrupoBem } from './montador-payloads';

export interface ClienteTransacionalSeedBens {
  $transaction<T>(
    operacao: (transacao: TransacaoSeedBens) => Promise<T>,
    opcoes?: { maxWait?: number; timeout?: number },
  ): Promise<T>;
}

export interface TransacaoSeedBens {
  bem: {
    upsert(args: Prisma.BemUpsertArgs): Promise<unknown>;
  };
}

export interface OpcoesPersistenciaSeedBens {
  tamanhoLote?: number;
}

export interface ResultadoPersistenciaSeedBens {
  lotesConcluidos: number;
  instalacoesProcessadas: number;
  bensPaisProcessados: number;
  bensFilhosProcessados: number;
}

const TAMANHO_LOTE_PADRAO = 10;

function validarTamanhoLote(tamanhoLote: number): void {
  if (!Number.isInteger(tamanhoLote) || tamanhoLote < 1) {
    throw new Error('O tamanho do lote deve ser um inteiro maior que zero.');
  }
}

function dividirEmLotes<T>(itens: T[], tamanhoLote: number): T[][] {
  const lotes: T[][] = [];
  for (let indice = 0; indice < itens.length; indice += tamanhoLote) {
    lotes.push(itens.slice(indice, indice + tamanhoLote));
  }
  return lotes;
}

function criarDadosAtualizacao(
  payload: Prisma.BemCreateInput,
): Prisma.BemUpdateInput {
  const { codigo_unico: _codigoUnico, ...dadosAtualizacao } = payload;
  return dadosAtualizacao;
}

async function persistirGrupo(
  transacao: TransacaoSeedBens,
  grupo: PayloadGrupoBem,
): Promise<void> {
  const codigoPai = grupo.pai.codigo_unico;

  const paiSalvo = (await transacao.bem.upsert({
    where: { codigo_unico: codigoPai },
    create: grupo.pai,
    update: criarDadosAtualizacao(grupo.pai),
  })) as { id?: number } | undefined;

  for (const filho of grupo.filhos) {
    const codigoFilho = filho.codigo_unico;
    const filhoPayload: Prisma.BemCreateInput = paiSalvo?.id
      ? {
          ...filho,
          bem_pai: { connect: { id: paiSalvo.id } },
        }
      : filho;

    await transacao.bem.upsert({
      where: { codigo_unico: codigoFilho },
      create: filhoPayload,
      update: criarDadosAtualizacao(filhoPayload),
    });
  }
}

export async function persistirPayloadsBem(
  cliente: ClienteTransacionalSeedBens,
  payloads: PayloadGrupoBem[],
  opcoes: OpcoesPersistenciaSeedBens = {},
): Promise<ResultadoPersistenciaSeedBens> {
  const clientePrisma = cliente as unknown as {
    bem?: {
      createMany?: (args: { data: unknown[]; skipDuplicates?: boolean }) => Promise<{ count: number }>;
      findMany?: (args: { where: unknown; select: unknown }) => Promise<Array<{ id: number; codigo_unico: string }>>;
    };
  };

  // Se o cliente for o PrismaClient real com suporte a createMany, utiliza a carga em massa (alta performance para nuvem)
  if (
    typeof clientePrisma.bem?.createMany === 'function' &&
    typeof clientePrisma.bem?.findMany === 'function' &&
    payloads.length > 0
  ) {
    const paisData = payloads.map((g) => {
      const { municipio, ...resto } = g.pai;
      return {
        ...resto,
        municipio_id: (municipio as { connect: { id: number } }).connect.id,
      };
    });

    for (let i = 0; i < paisData.length; i += 500) {
      const chunk = paisData.slice(i, i + 500);
      await clientePrisma.bem.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }

    const codigosPais = payloads.map((g) => g.pai.codigo_unico);
    const paisSalvos = await clientePrisma.bem.findMany({
      where: { codigo_unico: { in: codigosPais } },
      select: { id: true, codigo_unico: true },
    });
    const mapaPaisId = new Map(paisSalvos.map((p) => [p.codigo_unico, p.id]));

    const filhosData: unknown[] = [];
    for (const g of payloads) {
      const paiId = mapaPaisId.get(g.pai.codigo_unico);
      if (!paiId) continue;
      for (const f of g.filhos) {
        const { municipio, bem_pai: _bemPai, ...resto } = f;
        filhosData.push({
          ...resto,
          municipio_id: (municipio as { connect: { id: number } }).connect.id,
          bem_pai_id: paiId,
        });
      }
    }

    for (let i = 0; i < filhosData.length; i += 1000) {
      const chunk = filhosData.slice(i, i + 1000);
      await clientePrisma.bem.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }

    return {
      lotesConcluidos: 1,
      instalacoesProcessadas: payloads.length,
      bensPaisProcessados: payloads.length,
      bensFilhosProcessados: filhosData.length,
    };
  }

  // Fallback transacional por lotes (usado em testes unitários com mocks)
  const tamanhoLote = opcoes.tamanhoLote ?? TAMANHO_LOTE_PADRAO;
  validarTamanhoLote(tamanhoLote);

  const lotes = dividirEmLotes(payloads, tamanhoLote);
  let instalacoesProcessadas = 0;
  let bensPaisProcessados = 0;
  let bensFilhosProcessados = 0;

  for (const [indiceLote, lote] of lotes.entries()) {
    try {
      await cliente.$transaction(
        async (transacao) => {
          for (const grupo of lote) {
            await persistirGrupo(transacao, grupo);
          }
        },
        {
          maxWait: 15000,
          timeout: 60000,
        },
      );
    } catch (erro) {
      throw new Error(
        `Falha ao persistir o lote ${indiceLote + 1} de ${lotes.length}; a transação do lote foi revertida.`,
        { cause: erro },
      );
    }

    instalacoesProcessadas += lote.length;
    bensPaisProcessados += lote.length;
    bensFilhosProcessados += lote.reduce(
      (total, grupo) => total + grupo.filhos.length,
      0,
    );
  }

  return {
    lotesConcluidos: lotes.length,
    instalacoesProcessadas,
    bensPaisProcessados,
    bensFilhosProcessados,
  };
}
