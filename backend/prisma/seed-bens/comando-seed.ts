import type { Prisma } from '../../src/generated/prisma/client';
import type { MunicipioDominio } from './associador-municipios';
import { gravarRelatorioPendenciasMunicipio } from './relatorio-pendencias';
import { prepararSeedBens } from './orquestrador';
import {
  persistirPayloadsBem,
  type ClienteTransacionalSeedBens,
  type ResultadoPersistenciaSeedBens,
} from './persistidor';

export interface ClienteComandoSeedBens extends ClienteTransacionalSeedBens {
  municipio: {
    findMany(args: Prisma.MunicipioFindManyArgs): Promise<MunicipioDominio[]>;
  };
}

export interface LoggerComandoSeedBens {
  info(mensagem: string): void;
  warn(mensagem: string): void;
}

export interface ResultadoComandoSeedBens extends ResultadoPersistenciaSeedBens {
  linhasLidas: number;
  avisosLeitura: number;
  avisosAgrupamento: number;
  instalacoesPendentesMunicipio: number;
  linhasPendentesMunicipio: number;
  arquivoRelatorioPendencias: string | null;
}

function contarMotivos(motivos: string[]): string {
  const contagens = new Map<string, number>();
  for (const motivo of motivos) {
    contagens.set(motivo, (contagens.get(motivo) ?? 0) + 1);
  }
  return Array.from(contagens, ([motivo, quantidade]) =>
    quantidade > 1 ? `${motivo} (${quantidade})` : motivo,
  ).join('; ');
}

export async function executarComandoSeedBens(
  arquivo: string,
  cliente: ClienteComandoSeedBens,
  logger: LoggerComandoSeedBens,
): Promise<ResultadoComandoSeedBens> {
  const municipios = await cliente.municipio.findMany({
    select: {
      id: true,
      nome: true,
      nome_normalizado: true,
    },
  });

  const preparacao = await prepararSeedBens(arquivo, municipios);
  const arquivoRelatorioPendencias = await gravarRelatorioPendenciasMunicipio(
    arquivo,
    preparacao.pendenciasMunicipio,
  );
  const persistencia = await persistirPayloadsBem(cliente, preparacao.payloads);
  const instalacoesPendentesMunicipio = new Set(
    preparacao.pendenciasMunicipio.map(
      (pendencia) => pendencia.codigoUnicoInstalacao,
    ),
  ).size;

  const resultado: ResultadoComandoSeedBens = {
    ...persistencia,
    linhasLidas: preparacao.resumo.linhasLidas,
    avisosLeitura: preparacao.resumo.avisosLeitura.length,
    avisosAgrupamento: preparacao.resumo.avisosAgrupamento.length,
    instalacoesPendentesMunicipio,
    linhasPendentesMunicipio: preparacao.pendenciasMunicipio.length,
    arquivoRelatorioPendencias,
  };

  logger.info(
    [
      'Conferência do seed de bens concluída.',
      `Linhas lidas: ${resultado.linhasLidas}.`,
      `Instalações processadas: ${resultado.instalacoesProcessadas}.`,
      `Bens Pais processados: ${resultado.bensPaisProcessados}.`,
      `Bens Filhos processados: ${resultado.bensFilhosProcessados}.`,
      `Lotes concluídos: ${resultado.lotesConcluidos}.`,
      `Instalações adiadas por município: ${resultado.instalacoesPendentesMunicipio}.`,
      `Linhas adiadas por município: ${resultado.linhasPendentesMunicipio}.`,
      `Avisos de leitura: ${resultado.avisosLeitura}.`,
      `Avisos de agrupamento: ${resultado.avisosAgrupamento}.`,
    ].join(' '),
  );

  if (arquivoRelatorioPendencias) {
    logger.warn(
      `Relatório de pendências de município salvo em "${arquivoRelatorioPendencias}".`,
    );
  }

  if (preparacao.resumo.avisosLeitura.length > 0) {
    logger.warn(
      `Avisos de leitura por motivo: ${contarMotivos(
        preparacao.resumo.avisosLeitura.map((aviso) => aviso.motivo),
      )}.`,
    );
  }

  if (preparacao.resumo.avisosAgrupamento.length > 0) {
    logger.warn(
      `Avisos de agrupamento por motivo: ${contarMotivos(
        preparacao.resumo.avisosAgrupamento.map((aviso) => aviso.motivo),
      )}.`,
    );
  }

  return resultado;
}
