import type { Prisma } from '../../src/generated/prisma/client';
import type { PayloadGrupoBem } from './montador-payloads';

export interface ClienteTransacionalSeedBens {
  $transaction<T>(
    operacao: (transacao: TransacaoSeedBens) => Promise<T>,
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

const TAMANHO_LOTE_PADRAO = 50;

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

  await transacao.bem.upsert({
    where: { codigo_unico: codigoPai },
    create: grupo.pai,
    update: criarDadosAtualizacao(grupo.pai),
  });

  for (const filho of grupo.filhos) {
    const codigoFilho = filho.codigo_unico;
    await transacao.bem.upsert({
      where: { codigo_unico: codigoFilho },
      create: filho,
      update: criarDadosAtualizacao(filho),
    });
  }
}

export async function persistirPayloadsBem(
  cliente: ClienteTransacionalSeedBens,
  payloads: PayloadGrupoBem[],
  opcoes: OpcoesPersistenciaSeedBens = {},
): Promise<ResultadoPersistenciaSeedBens> {
  const tamanhoLote = opcoes.tamanhoLote ?? TAMANHO_LOTE_PADRAO;
  validarTamanhoLote(tamanhoLote);

  const lotes = dividirEmLotes(payloads, tamanhoLote);
  let instalacoesProcessadas = 0;
  let bensPaisProcessados = 0;
  let bensFilhosProcessados = 0;

  for (const [indiceLote, lote] of lotes.entries()) {
    try {
      await cliente.$transaction(async (transacao) => {
        for (const grupo of lote) {
          await persistirGrupo(transacao, grupo);
        }
      });
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
