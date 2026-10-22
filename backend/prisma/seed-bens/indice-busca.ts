import { SituacaoBem, TipoSistema } from '../../generated/prisma/enums';
import { normalizarTexto } from '../normalizar-texto';
import { seedConfig } from '../seed-config';
import type { GrupoComMunicipio } from './associador-municipios';
import type { LinhaBemPlanilha } from './arquivo-reader';

export interface IndiceBuscaPai {
  codigoUnicoInstalacao: string;
  buscaTexto: string;
}

export interface IndiceBuscaFilho {
  codigoUnicoBem: string;
  buscaTexto: string;
}

export interface IndicesBusca {
  pais: IndiceBuscaPai[];
  filhos: IndiceBuscaFilho[];
}

function normalizarCampos(campos: unknown[]): string {
  return Array.from(
    new Set(
      campos
        .filter(
          (campo): campo is string | number | boolean =>
            typeof campo === 'string' ||
            typeof campo === 'number' ||
            typeof campo === 'boolean',
        )
        .map((campo) => normalizarTexto(String(campo)))
        .filter(Boolean),
    ),
  ).join(' ');
}

function sistemaParaTexto(tipoSistema: TipoSistema): string {
  return tipoSistema === TipoSistema.NAO_INFORMADO ? 'N/I' : tipoSistema;
}

function situacaoParaTexto(situacao: SituacaoBem): string {
  return situacao === SituacaoBem.OPERANDO ? 'Operando' : 'Inoperante';
}

function montarBuscaTextoPai(grupo: GrupoComMunicipio): string {
  const primeiraLinha = grupo.equipamentos[0];
  if (!primeiraLinha) {
    throw new Error(
      `Instalação "${grupo.codigoUnicoInstalacao}" não possui dados para montar a busca do Bem Pai.`,
    );
  }

  return normalizarCampos([
    grupo.codigoUnicoInstalacao,
    primeiraLinha.nomeInstalacao,
    primeiraLinha.endereco,
    primeiraLinha.municipio,
    grupo.categoria,
    sistemaParaTexto(grupo.tipoSistema),
    situacaoParaTexto(grupo.situacao),
  ]);
}

function montarBuscaTextoFilho(linha: LinhaBemPlanilha): string {
  const colunasDaInstalacao = new Set(
    [
      ...seedConfig.colunasNucleoPai.map((campo) => seedConfig.colunas[campo]),
      ...seedConfig.colunasDadosComplementaresPai,
    ].map((coluna) => coluna.trim().toUpperCase()),
  );
  const camposDoEquipamento = Object.entries(linha.dadosOriginais)
    .filter(([coluna]) => !colunasDaInstalacao.has(coluna.trim().toUpperCase()))
    .map(([, valor]) => valor);

  return normalizarCampos(camposDoEquipamento);
}

export function montarIndicesBusca(grupos: GrupoComMunicipio[]): IndicesBusca {
  const pais: IndiceBuscaPai[] = [];
  const filhos: IndiceBuscaFilho[] = [];

  for (const grupo of grupos) {
    pais.push({
      codigoUnicoInstalacao: grupo.codigoUnicoInstalacao,
      buscaTexto: montarBuscaTextoPai(grupo),
    });

    for (const equipamento of grupo.equipamentos) {
      filhos.push({
        codigoUnicoBem: equipamento.idBem,
        buscaTexto: montarBuscaTextoFilho(equipamento),
      });
    }
  }

  return { pais, filhos };
}
