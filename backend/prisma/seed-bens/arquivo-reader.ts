import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { seedConfig } from '../seed-config';

type ValorPlanilha = string | number | boolean | null;

export interface LinhaBemPlanilha {
  numeroLinha: number;
  idBem: string;
  nomeBem: string;
  codigoUnicoInstalacao: string;
  nomeInstalacao: string;
  municipio: string;
  endereco: string;
  latitude: number | null;
  longitude: number | null;
  condicaoOperacional: string;
  dadosOriginais: Record<string, unknown>;
}

export interface AvisoLeitura {
  numeroLinha: number;
  coluna: string;
  valor: string;
  motivo: string;
}

export interface ResultadoLeituraBens {
  linhas: LinhaBemPlanilha[];
  avisos: AvisoLeitura[];
}

interface ColunasPlanilha {
  indices: Map<string, number>;
  cabecalhos: Map<number, string>;
}

function normalizarCabecalho(valor: ValorPlanilha): string {
  return String(valor ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toUpperCase();
}

function obterValorCelula(valor: ExcelJS.CellValue): ValorPlanilha {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor !== 'object') return valor;
  if ('error' in valor) return valor.error;
  if ('richText' in valor) {
    return valor.richText.map((parte) => parte.text).join('');
  }
  if ('text' in valor) return valor.text;
  if ('result' in valor) return obterValorCelula(valor.result ?? null);
  return null;
}

function obterTexto(valor: ValorPlanilha): string {
  if (valor === null || valor === undefined) return '';
  return String(valor).trim();
}

function converterCoordenada(valor: ValorPlanilha): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null;
  }

  const texto = String(valor).trim();
  if (!texto) return null;

  const numero = Number(texto.replace(',', '.'));
  return Number.isFinite(numero) ? numero : null;
}

function contarSeparadoresCabecalho(linha: string, separador: string): number {
  let quantidade = 0;
  let entreAspas = false;

  for (let indice = 0; indice < linha.length; indice++) {
    const caractere = linha[indice];

    if (caractere === '"') {
      if (entreAspas && linha[indice + 1] === '"') {
        indice++;
      } else {
        entreAspas = !entreAspas;
      }
    } else if (caractere === separador && !entreAspas) {
      quantidade++;
    }
  }

  return quantidade;
}

async function obterSeparadorCsv(arquivo: string): Promise<string> {
  const entrada = createReadStream(arquivo, { encoding: 'utf8' });
  const linhas = createInterface({ input: entrada, crlfDelay: Infinity });

  try {
    for await (const linha of linhas) {
      if (!linha.trim()) continue;

      const separadores = [',', ';', '\t'];
      return separadores.reduce((maisFrequente, atual) =>
        contarSeparadoresCabecalho(linha, atual) >
        contarSeparadoresCabecalho(linha, maisFrequente)
          ? atual
          : maisFrequente,
      );
    }
  } finally {
    linhas.close();
    entrada.destroy();
  }

  throw new Error(`O arquivo CSV está vazio: ${arquivo}`);
}

function obterColunasPlanilha(
  planilha: ExcelJS.Worksheet,
): ColunasPlanilha {
  const cabecalhos = new Map<number, string>();
  const indices = new Map<string, number>();
  const linhaCabecalho = planilha.getRow(1);

  linhaCabecalho.eachCell({ includeEmpty: true }, (celula, indice) => {
    const cabecalho = normalizarCabecalho(
      obterValorCelula(celula.value),
    );
    if (!cabecalho) return;

    if (indices.has(cabecalho)) {
      throw new Error(
        `Cabeçalho duplicado "${cabecalho}" na coluna ${indice}.`,
      );
    }

    indices.set(cabecalho, indice);
    cabecalhos.set(indice, cabecalho);
  });

  const colunasConfiguradas = [
    ...Object.values(seedConfig.colunas),
    ...seedConfig.colunasDadosComplementaresPai,
  ];
  const ausentes = colunasConfiguradas.filter(
    (coluna) => !indices.has(normalizarCabecalho(coluna)),
  );
  if (ausentes.length > 0) {
    throw new Error(
      `Colunas obrigatórias ausentes na planilha: ${ausentes.join(', ')}.`,
    );
  }

  return { indices, cabecalhos };
}

function criarLinhaBem(
  linha: ExcelJS.Row,
  colunas: ColunasPlanilha,
  avisos: AvisoLeitura[],
): LinhaBemPlanilha | null {
  const dadosOriginais: Record<string, unknown> = {};
  let possuiValores = false;

  linha.eachCell({ includeEmpty: true }, (celula, indice) => {
    const valor = obterValorCelula(celula.value);
    if (valor !== null && valor !== '') possuiValores = true;

    const cabecalho = colunas.cabecalhos.get(indice);
    if (!cabecalho) {
      if (valor !== null && valor !== '') {
        throw new Error(
          `Há um valor sem cabeçalho na linha ${linha.number}, coluna ${indice}.`,
        );
      }
      return;
    }

    dadosOriginais[cabecalho] = valor;
  });

  if (!possuiValores) return null;

  const obterCampo = (campo: keyof typeof seedConfig.colunas) => {
    const cabecalho = normalizarCabecalho(seedConfig.colunas[campo]);
    const indice = colunas.indices.get(cabecalho);
    if (indice === undefined) {
      throw new Error(`Configuração sem coluna mapeada para "${campo}".`);
    }
    return obterValorCelula(linha.getCell(indice).value);
  };

  const converterCampoCoordenada = (
    campo: 'latitude' | 'longitude',
  ): number | null => {
    const valor = obterCampo(campo);
    const coordenada = converterCoordenada(valor);

    if (
      coordenada === null &&
      valor !== null &&
      valor !== undefined &&
      String(valor).trim() !== ''
    ) {
      avisos.push({
        numeroLinha: linha.number,
        coluna: seedConfig.colunas[campo],
        valor: String(valor),
        motivo: 'Valor não numérico; coordenada tratada como ausente.',
      });
    }

    return coordenada;
  };

  return {
    numeroLinha: linha.number,
    idBem: obterTexto(obterCampo('idBem')),
    nomeBem: obterTexto(obterCampo('nomeBem')),
    codigoUnicoInstalacao: obterTexto(
      obterCampo('codigoUnicoInstalacao'),
    ),
    nomeInstalacao: obterTexto(obterCampo('nomeInstalacao')),
    municipio: obterTexto(obterCampo('municipio')),
    endereco: obterTexto(obterCampo('endereco')),
    latitude: converterCampoCoordenada('latitude'),
    longitude: converterCampoCoordenada('longitude'),
    condicaoOperacional: obterTexto(
      obterCampo('condicaoOperacional'),
    ),
    dadosOriginais,
  };
}

export async function lerArquivoBens(
  arquivo: string,
): Promise<ResultadoLeituraBens> {
  const extensao = path.extname(arquivo).toLowerCase();
  const workbook = new ExcelJS.Workbook();
  let planilha: ExcelJS.Worksheet;

  if (extensao === '.xlsx') {
    const carregado = await workbook.xlsx.readFile(arquivo);
    const primeiraPlanilha = carregado.worksheets[0];
    if (!primeiraPlanilha) {
      throw new Error(`O arquivo XLSX não possui planilhas: ${arquivo}`);
    }
    planilha = primeiraPlanilha;
  } else if (extensao === '.csv') {
    const separador = await obterSeparadorCsv(arquivo);
    planilha = await workbook.csv.readFile(arquivo, {
      map: (valor) => valor,
      parserOptions: {
        delimiter: separador,
        headers: false,
        ignoreEmpty: true,
        trim: true,
      },
    });
  } else {
    throw new Error(
      `Formato não suportado para "${arquivo}". Use um arquivo .csv ou .xlsx.`,
    );
  }

  const colunas = obterColunasPlanilha(planilha);
  const avisos: AvisoLeitura[] = [];
  const linhas: LinhaBemPlanilha[] = [];

  planilha.eachRow({ includeEmpty: false }, (linha) => {
    if (linha.number === 1) return;
    const registro = criarLinhaBem(linha, colunas, avisos);
    if (registro) linhas.push(registro);
  });

  return { linhas, avisos };
}
