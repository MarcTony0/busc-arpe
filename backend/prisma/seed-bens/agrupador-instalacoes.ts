import { SituacaoBem, TipoSistema } from '../../src/generated/prisma/enums';
import { normalizarTexto } from '../normalizar-texto';
import { seedConfig } from '../seed-config';
import type { LinhaBemPlanilha } from './arquivo-reader';

const CONDICOES_INOPERANTES = new Set([
  'ativo ausente (inexistente)',
  'ativo ausente (manutencao)',
  'nao instalado',
  'nunca operou',
]);
const CONDICOES_NAO_INFORMADAS = new Set(['n/i', 'outro']);

export interface GrupoInstalacao {
  codigoUnicoInstalacao: string;
  categoria: string;
  tipoSistema: TipoSistema;
  situacao: SituacaoBem;
  equipamentos: LinhaBemPlanilha[];
  latitude: number | null;
  longitude: number | null;
}

export interface AvisoAgrupamento {
  codigoUnicoInstalacao: string;
  motivo: string;
}

export interface ResultadoAgrupamento {
  grupos: GrupoInstalacao[];
  avisos: AvisoAgrupamento[];
}

function obterSigla(codigoUnicoInstalacao: string): string | null {
  const blocos = codigoUnicoInstalacao
    .split('-')
    .map((bloco) => bloco.trim().toUpperCase());

  for (const bloco of blocos) {
    if (siglaConhecida(bloco)) {
      return bloco;
    }
  }

  if (blocos[0] === 'NOVO' && blocos.length > 2) {
    return blocos[2] || null;
  }

  return blocos[1] || null;
}

function siglaConhecida(
  sigla: string,
): sigla is keyof typeof seedConfig.sistemaPorSigla {
  return Object.prototype.hasOwnProperty.call(
    seedConfig.sistemaPorSigla,
    sigla,
  );
}

function obterSistema(sigla: string | null): TipoSistema {
  if (sigla !== null && siglaConhecida(sigla)) {
    return seedConfig.sistemaPorSigla[sigla];
  }

  return seedConfig.sistemaDesconhecido;
}

function interpretarCondicaoOperacional(condicao: string): SituacaoBem | null {
  const condicaoNormalizada = normalizarTexto(condicao);

  if (
    condicaoNormalizada === 'operando' ||
    condicaoNormalizada === 'em operacao'
  ) {
    return SituacaoBem.OPERANDO;
  }
  if (CONDICOES_INOPERANTES.has(condicaoNormalizada)) {
    return SituacaoBem.INOPERANTE;
  }
  if (
    CONDICOES_NAO_INFORMADAS.has(condicaoNormalizada) ||
    condicaoNormalizada === 'n/a'
  ) {
    return SituacaoBem.NAO_INFORMADO;
  }
  if (
    condicaoNormalizada.startsWith('inoperante') ||
    condicaoNormalizada.startsWith('desativad')
  ) {
    return SituacaoBem.INOPERANTE;
  }

  return null;
}

export function derivarSituacaoFilho(
  equipamento: LinhaBemPlanilha,
): SituacaoBem {
  const situacao = interpretarCondicaoOperacional(
    equipamento.condicaoOperacional,
  );

  if (situacao === null) {
    const valor = equipamento.condicaoOperacional || '(vazio)';
    throw new Error(
      `Condição operacional vazia ou não reconhecida para ${seedConfig.colunas.condicaoOperacional}: linha ${equipamento.numeroLinha}: "${valor}".`,
    );
  }

  return situacao;
}

export function derivarSituacaoPai(
  equipamentos: LinhaBemPlanilha[],
): SituacaoBem {
  if (equipamentos.length === 0) {
    throw new Error('Não é possível derivar a situação sem equipamentos.');
  }

  const situacoes = equipamentos.map(derivarSituacaoFilho);

  if (situacoes.some((situacao) => situacao === SituacaoBem.OPERANDO)) {
    return SituacaoBem.OPERANDO;
  }
  if (situacoes.every((situacao) => situacao === SituacaoBem.NAO_INFORMADO)) {
    return SituacaoBem.NAO_INFORMADO;
  }
  return SituacaoBem.INOPERANTE;
}

function calcularMediaCoordenadas(equipamentos: LinhaBemPlanilha[]): {
  latitude: number | null;
  longitude: number | null;
} {
  const equipamentosComCoordenadas = equipamentos.filter(
    (equipamento) =>
      equipamento.latitude !== null && equipamento.longitude !== null,
  );

  if (equipamentosComCoordenadas.length === 0) {
    return { latitude: null, longitude: null };
  }

  let totalLatitude = 0;
  let totalLongitude = 0;
  for (const equipamento of equipamentosComCoordenadas) {
    if (equipamento.latitude === null || equipamento.longitude === null) {
      continue;
    }
    totalLatitude += equipamento.latitude;
    totalLongitude += equipamento.longitude;
  }

  return {
    latitude: totalLatitude / equipamentosComCoordenadas.length,
    longitude: totalLongitude / equipamentosComCoordenadas.length,
  };
}

export function agruparInstalacoes(
  linhas: LinhaBemPlanilha[],
): ResultadoAgrupamento {
  const equipamentosPorInstalacao = new Map<string, LinhaBemPlanilha[]>();

  for (const linha of linhas) {
    const codigo = linha.codigoUnicoInstalacao.trim();
    if (!codigo) {
      throw new Error(
        `Linha ${linha.numeroLinha}: ${seedConfig.colunas.codigoUnicoInstalacao} é obrigatório para agrupar equipamentos.`,
      );
    }

    const equipamentos = equipamentosPorInstalacao.get(codigo) ?? [];
    equipamentos.push(linha);
    equipamentosPorInstalacao.set(codigo, equipamentos);
  }

  const avisos: AvisoAgrupamento[] = [];
  const grupos = Array.from(
    equipamentosPorInstalacao,
    ([codigoUnicoInstalacao, equipamentos]): GrupoInstalacao => {
      const sigla = obterSigla(codigoUnicoInstalacao);
      let tipoSistema = obterSistema(sigla);
      if (tipoSistema === seedConfig.sistemaDesconhecido) {
        const servico = equipamentos[0]?.dadosOriginais?.['SERVICO'];
        if (typeof servico === 'string') {
          const servicoNormalizado = normalizarTexto(servico);
          if (servicoNormalizado.includes('agua')) {
            tipoSistema = TipoSistema.SAA;
          } else if (servicoNormalizado.includes('esgoto')) {
            tipoSistema = TipoSistema.SES;
          }
        }
      }
      const categoria = sigla ?? 'N/I';

      if (sigla === null && tipoSistema === seedConfig.sistemaDesconhecido) {
        avisos.push({
          codigoUnicoInstalacao,
          motivo:
            'Código sem sigla no segundo bloco; categoria e sistema definidos como N/I.',
        });
      } else if (tipoSistema === seedConfig.sistemaDesconhecido) {
        avisos.push({
          codigoUnicoInstalacao,
          motivo: `Sigla "${sigla}" não mapeada; tipo de sistema definido como N/I.`,
        });
      }

      const coordenadas = calcularMediaCoordenadas(equipamentos);
      if (coordenadas.latitude === null || coordenadas.longitude === null) {
        avisos.push({
          codigoUnicoInstalacao,
          motivo:
            'Nenhum equipamento do grupo possui latitude e longitude válidas; coordenadas do pai ausentes.',
        });
      }

      return {
        codigoUnicoInstalacao,
        categoria,
        tipoSistema,
        situacao: derivarSituacaoPai(equipamentos),
        equipamentos,
        ...coordenadas,
      };
    },
  );

  return { grupos, avisos };
}
