import { Prisma } from '../../generated/prisma/client';
import { normalizarTexto } from '../normalizar-texto';
import { seedConfig } from '../seed-config';
import {
  derivarSituacaoFilho,
  type GrupoInstalacao,
} from './agrupador-instalacoes';
import type { GrupoComMunicipio } from './associador-municipios';
import type { LinhaBemPlanilha } from './arquivo-reader';
import { montarIndicesBusca } from './indice-busca';

export interface PayloadGrupoBem {
  pai: Prisma.BemCreateInput;
  filhos: Prisma.BemCreateInput[];
}

function normalizarCabecalho(cabecalho: string): string {
  return cabecalho.trim().toUpperCase();
}

function valorComparavel(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string') return normalizarTexto(valor);
  if (typeof valor === 'number' || typeof valor === 'boolean') {
    return String(valor);
  }

  throw new Error(
    'Valor de coluna complementar não suportado para comparação entre equipamentos.',
  );
}

function conferirValoresDaInstalacao(grupo: GrupoInstalacao): void {
  const primeiraLinha = grupo.equipamentos[0];
  if (!primeiraLinha) {
    throw new Error(
      `Instalação "${grupo.codigoUnicoInstalacao}" não possui equipamentos.`,
    );
  }

  const obterValor = (linha: LinhaBemPlanilha, coluna: string): unknown => {
    if (coluna === seedConfig.colunas.nomeInstalacao) {
      return linha.nomeInstalacao;
    }
    if (coluna === seedConfig.colunas.municipio) {
      return linha.municipio;
    }
    if (coluna === seedConfig.colunas.endereco) {
      return linha.endereco;
    }
    return linha.dadosOriginais[coluna];
  };

  const colunasDaInstalacao = [
    seedConfig.colunas.nomeInstalacao,
    seedConfig.colunas.municipio,
    seedConfig.colunas.endereco,
    ...seedConfig.colunasDadosComplementaresPai,
  ];

  for (const coluna of colunasDaInstalacao) {
    const valorReferencia = valorComparavel(obterValor(primeiraLinha, coluna));
    const divergentes = grupo.equipamentos.filter(
      (linha) => valorComparavel(obterValor(linha, coluna)) !== valorReferencia,
    );

    if (divergentes.length > 0) {
      const linhas = [
        primeiraLinha.numeroLinha,
        ...divergentes.map((linha) => linha.numeroLinha),
      ].join(', ');
      throw new Error(
        `Instalação "${grupo.codigoUnicoInstalacao}" possui valores inconsistentes para ${coluna} nas linhas ${linhas}.`,
      );
    }
  }
}

function criarObjetoJson(
  dadosOriginais: Record<string, unknown>,
  incluirColunas?: Set<string>,
  excluirColunas: Set<string> = new Set(),
): Prisma.InputJsonObject {
  const resultado: Record<string, string | number | boolean> = {};

  for (const [coluna, valor] of Object.entries(dadosOriginais)) {
    const cabecalho = normalizarCabecalho(coluna);
    if (incluirColunas && !incluirColunas.has(cabecalho)) continue;
    if (excluirColunas.has(cabecalho)) continue;
    if (valor === null || valor === undefined) continue;

    if (
      typeof valor === 'string' ||
      typeof valor === 'boolean' ||
      (typeof valor === 'number' && Number.isFinite(valor))
    ) {
      resultado[cabecalho] = valor;
      continue;
    }

    throw new Error(`Valor não suportado para JSONB na coluna "${cabecalho}".`);
  }

  return resultado;
}

function criarDadosComplementaresPai(
  linha: LinhaBemPlanilha,
): Prisma.InputJsonObject {
  const colunasPai = new Set(
    seedConfig.colunasDadosComplementaresPai.map(normalizarCabecalho),
  );
  return criarObjetoJson(linha.dadosOriginais, colunasPai);
}

function criarDadosComplementaresFilho(
  linha: LinhaBemPlanilha,
): Prisma.InputJsonObject {
  const colunasNucleoPai = new Set(
    seedConfig.colunasNucleoPai.map((campo) =>
      normalizarCabecalho(seedConfig.colunas[campo]),
    ),
  );
  const colunasNucleoFilho = new Set(
    seedConfig.colunasNucleoFilho.map((campo) =>
      normalizarCabecalho(seedConfig.colunas[campo]),
    ),
  );
  const colunasComplementaresPai = new Set(
    seedConfig.colunasDadosComplementaresPai.map(normalizarCabecalho),
  );

  return criarObjetoJson(
    linha.dadosOriginais,
    undefined,
    new Set([
      ...colunasNucleoPai,
      ...colunasNucleoFilho,
      ...colunasComplementaresPai,
    ]),
  );
}

function conferirCodigosUnicos(grupos: GrupoComMunicipio[]): void {
  const codigos = new Set<string>();

  for (const grupo of grupos) {
    if (codigos.has(grupo.codigoUnicoInstalacao)) {
      throw new Error(
        `Código único de instalação duplicado: "${grupo.codigoUnicoInstalacao}".`,
      );
    }
    codigos.add(grupo.codigoUnicoInstalacao);

    for (const equipamento of grupo.equipamentos) {
      const codigoBem = equipamento.idBem.trim();
      if (!codigoBem) {
        throw new Error(
          `Linha ${equipamento.numeroLinha}: ${seedConfig.colunas.idBem} é obrigatório.`,
        );
      }
      if (codigos.has(codigoBem)) {
        throw new Error(
          `Código único de bem duplicado: "${codigoBem}" (linha ${equipamento.numeroLinha}).`,
        );
      }
      codigos.add(codigoBem);
    }
  }
}

function obterNomeInstalacao(grupo: GrupoInstalacao): string {
  const nome = grupo.equipamentos[0]?.nomeInstalacao.trim();
  if (!nome) {
    throw new Error(
      `Instalação "${grupo.codigoUnicoInstalacao}" não possui nome.`,
    );
  }
  return nome;
}

function obterNomeEquipamento(equipamento: LinhaBemPlanilha): string {
  const nome = equipamento.nomeBem.trim();
  if (!nome) {
    throw new Error(
      `Linha ${equipamento.numeroLinha}: ${seedConfig.colunas.nomeBem} é obrigatório.`,
    );
  }
  return nome;
}

export function montarPayloadsBem(
  grupos: GrupoComMunicipio[],
): PayloadGrupoBem[] {
  conferirCodigosUnicos(grupos);

  const indicesBusca = montarIndicesBusca(grupos);
  const buscaPaiPorCodigo = new Map(
    indicesBusca.pais.map((indice) => [
      indice.codigoUnicoInstalacao,
      indice.buscaTexto,
    ]),
  );
  const buscaFilhoPorCodigo = new Map(
    indicesBusca.filhos.map((indice) => [
      indice.codigoUnicoBem,
      indice.buscaTexto,
    ]),
  );

  return grupos.map((grupo) => {
    conferirValoresDaInstalacao(grupo);
    const primeiraLinha = grupo.equipamentos[0];
    if (!primeiraLinha) {
      throw new Error(
        `Instalação "${grupo.codigoUnicoInstalacao}" não possui equipamentos.`,
      );
    }

    const buscaTextoPai = buscaPaiPorCodigo.get(grupo.codigoUnicoInstalacao);
    if (buscaTextoPai === undefined) {
      throw new Error(
        `Índice de busca não encontrado para a instalação "${grupo.codigoUnicoInstalacao}".`,
      );
    }

    const pai: Prisma.BemCreateInput = {
      codigo_unico: grupo.codigoUnicoInstalacao,
      nome: obterNomeInstalacao(grupo),
      endereco: primeiraLinha.endereco || null,
      municipio: { connect: { id: grupo.municipioId } },
      latitude: grupo.latitude,
      longitude: grupo.longitude,
      categoria: grupo.categoria,
      tipo_sistema: grupo.tipoSistema,
      situacao: grupo.situacao,
      is_pai: true,
      dados_complementares: criarDadosComplementaresPai(primeiraLinha),
      busca_texto: buscaTextoPai,
    };

    const filhos = grupo.equipamentos.map((equipamento) => {
      const buscaTextoFilho = buscaFilhoPorCodigo.get(equipamento.idBem);
      if (buscaTextoFilho === undefined) {
        throw new Error(
          `Índice de busca não encontrado para o equipamento "${equipamento.idBem}".`,
        );
      }

      const filho: Prisma.BemCreateInput = {
        codigo_unico: equipamento.idBem.trim(),
        nome: obterNomeEquipamento(equipamento),
        endereco: null,
        municipio: { connect: { id: grupo.municipioId } },
        latitude: equipamento.latitude,
        longitude: equipamento.longitude,
        categoria: grupo.categoria,
        tipo_sistema: grupo.tipoSistema,
        situacao: derivarSituacaoFilho(equipamento),
        is_pai: false,
        dados_complementares: criarDadosComplementaresFilho(equipamento),
        busca_texto: buscaTextoFilho,
        bem_pai: {
          connect: { codigo_unico: grupo.codigoUnicoInstalacao },
        },
      };

      return filho;
    });

    return { pai, filhos };
  });
}
