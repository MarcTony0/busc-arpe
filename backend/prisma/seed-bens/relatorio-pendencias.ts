import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { PendenciaAssociacaoMunicipio } from './associador-municipios';

function escaparCampoCsv(valor: string): string {
  return `"${valor.replaceAll('"', '""')}"`;
}

function criarConteudoCsv(pendencias: PendenciaAssociacaoMunicipio[]): string {
  const cabecalho = [
    'CODIGO_UNICO_INSTALACAO',
    'NUMERO_LINHA',
    'MUNICIPIO_INFORMADO',
    'MOTIVO',
  ];
  const linhas = pendencias.map((pendencia) =>
    [
      pendencia.codigoUnicoInstalacao,
      String(pendencia.numeroLinha),
      pendencia.municipioInformado,
      pendencia.motivo,
    ]
      .map(escaparCampoCsv)
      .join(';'),
  );

  return `\uFEFF${[cabecalho.map(escaparCampoCsv).join(';'), ...linhas].join(
    '\r\n',
  )}\r\n`;
}

function criarSufixoData(data: Date): string {
  return data.toISOString().replace(/[:.]/g, '-');
}

export async function gravarRelatorioPendenciasMunicipio(
  arquivoOrigem: string,
  pendencias: PendenciaAssociacaoMunicipio[],
  data = new Date(),
): Promise<string | null> {
  if (pendencias.length === 0) return null;

  const caminhoRelatorio = path.join(
    path.dirname(arquivoOrigem),
    `pendencias-seed-bens-${criarSufixoData(data)}.csv`,
  );

  await writeFile(caminhoRelatorio, criarConteudoCsv(pendencias), {
    encoding: 'utf8',
    flag: 'wx',
  });

  return caminhoRelatorio;
}
