import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import XLSX = require('xlsx');
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

function normalizarValorCelula(valor: unknown): ValorPlanilha {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) return valor.toISOString();
  if (
    typeof valor === 'string' ||
    typeof valor === 'number' ||
    typeof valor === 'boolean'
  ) {
    return valor;
  }
  if (typeof valor !== 'object') {
    throw new Error('Tipo de valor de célula não suportado.');
  }
  if ('error' in valor) {
    if (typeof valor.error !== 'string') {
      throw new Error('Valor de erro de célula não reconhecido.');
    }
    return valor.error;
  }
  if ('richText' in valor && Array.isArray(valor.richText)) {
    return valor.richText
      .map((parte: unknown) =>
        typeof parte === 'object' &&
        parte !== null &&
        'text' in parte &&
        typeof parte.text === 'string'
          ? parte.text
          : '',
      )
      .join('');
  }
  if ('text' in valor && typeof valor.text === 'string') {
    return valor.text;
  }
  if ('result' in valor) {
    return normalizarValorCelula(valor.result ?? null);
  }
  throw new Error('Objeto de célula não reconhecido.');
}

function obterValorCelula(celula: XLSX.CellObject | undefined): ValorPlanilha {
  return normalizarValorCelula(celula?.v);
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

function obterLinhasPlanilha(planilha: XLSX.WorkSheet): ValorPlanilha[][] {
  const referencia = planilha['!ref'];
  if (!referencia) return [];

  const intervalo = XLSX.utils.decode_range(referencia);
  return Array.from({ length: intervalo.e.r + 1 }, (_, linha) =>
    Array.from({ length: intervalo.e.c + 1 }, (_, coluna) =>
      obterValorCelula(
        planilha[XLSX.utils.encode_cell({ r: linha, c: coluna })],
      ),
    ),
  );
}

function obterColunasPlanilha(linhas: ValorPlanilha[][]): ColunasPlanilha {
  const cabecalhos = new Map<number, string>();
  const indices = new Map<string, number>();
  const linhaCabecalho = linhas[0] ?? [];

  linhaCabecalho.forEach((valor, indiceZeroBased) => {
    const indice = indiceZeroBased + 1;
    let cabecalho = normalizarCabecalho(valor);
    if (!cabecalho) return;
    if (cabecalho === 'MICROREGIAO') {
      cabecalho = 'MICRORREGIAO';
    }

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
  linha: ValorPlanilha[],
  numeroLinha: number,
  colunas: ColunasPlanilha,
  avisos: AvisoLeitura[],
): LinhaBemPlanilha | null {
  const dadosOriginais: Record<string, unknown> = {};

  linha.forEach((valor, indiceZeroBased) => {
    const indice = indiceZeroBased + 1;
    const cabecalho = colunas.cabecalhos.get(indice);
    if (!cabecalho) {
      if (valor !== null && valor !== '') {
        throw new Error(
          `Há um valor sem cabeçalho na linha ${numeroLinha}, coluna ${indice}.`,
        );
      }
      return;
    }

    dadosOriginais[cabecalho] = valor;
  });

  if (!linha.some((valor) => valor !== null && valor !== '')) return null;

  const obterCampo = (campo: keyof typeof seedConfig.colunas) => {
    const cabecalho = normalizarCabecalho(seedConfig.colunas[campo]);
    const indice = colunas.indices.get(cabecalho);
    if (indice === undefined) {
      throw new Error(`Configuração sem coluna mapeada para "${campo}".`);
    }
    return linha[indice - 1] ?? null;
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
        numeroLinha,
        coluna: seedConfig.colunas[campo],
        valor: String(valor),
        motivo: 'Valor não numérico; coordenada tratada como ausente.',
      });
    }

    return coordenada;
  };

  const idBem = obterTexto(obterCampo('idBem'));
  const codigoUnicoInstalacao = obterTexto(obterCampo('codigoUnicoInstalacao'));

  if (!idBem && !codigoUnicoInstalacao) {
    return null;
  }

  return {
    numeroLinha,
    idBem,
    nomeBem: obterTexto(obterCampo('nomeBem')),
    codigoUnicoInstalacao,
    nomeInstalacao: obterTexto(obterCampo('nomeInstalacao')),
    municipio: obterTexto(obterCampo('municipio')),
    endereco: obterTexto(obterCampo('endereco')),
    latitude: converterCampoCoordenada('latitude'),
    longitude: converterCampoCoordenada('longitude'),
    condicaoOperacional: obterTexto(obterCampo('condicaoOperacional')),
    dadosOriginais,
  };
}

export async function lerArquivoBens(
  arquivo: string,
): Promise<ResultadoLeituraBens> {
  const extensao = path.extname(arquivo).toLowerCase();
  let workbook: XLSX.WorkBook;

  if (extensao === '.xlsx') {
    workbook = XLSX.readFile(arquivo, { cellDates: true });
  } else if (extensao === '.csv') {
    const separador = await obterSeparadorCsv(arquivo);
    const conteudo = await readFile(arquivo, 'utf8');
    workbook = XLSX.read(conteudo, {
      type: 'string',
      FS: separador,
      raw: true,
      cellDates: true,
    });
  } else {
    throw new Error(
      `Formato não suportado para "${arquivo}". Use um arquivo .csv ou .xlsx.`,
    );
  }

  const nomePrimeiraPlanilha = workbook.SheetNames[0];
  if (!nomePrimeiraPlanilha) {
    if (extensao === '.xlsx') {
      throw new Error(`O arquivo XLSX não possui planilhas: ${arquivo}`);
    }
    throw new Error(`O arquivo CSV não possui dados tabulares: ${arquivo}`);
  }

  const planilha = workbook.Sheets[nomePrimeiraPlanilha];
  if (!planilha) {
    throw new Error(
      `Não foi possível carregar a primeira planilha do arquivo: ${arquivo}`,
    );
  }

  const linhasPlanilha = obterLinhasPlanilha(planilha);
  const colunas = obterColunasPlanilha(linhasPlanilha);
  const avisos: AvisoLeitura[] = [];
  const linhas: LinhaBemPlanilha[] = [];

  linhasPlanilha.forEach((linha, indice) => {
    if (indice === 0) return;
    const registro = criarLinhaBem(linha, indice + 1, colunas, avisos);
    if (registro) linhas.push(registro);
  });

  return { linhas, avisos };
}
