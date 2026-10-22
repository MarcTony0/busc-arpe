import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { seedConfig } from '../seed-config';
import { lerArquivoBens } from './arquivo-reader';

describe('lerArquivoBens', () => {
  let diretorioTemporario: string;

  beforeEach(async () => {
    diretorioTemporario = await mkdtemp(
      path.join(os.tmpdir(), 'buscarpe-seed-'),
    );
  });

  afterEach(async () => {
    await rm(diretorioTemporario, { recursive: true, force: true });
  });

  it('lê CSV separado por ponto e vírgula e converte coordenadas com vírgula decimal', async () => {
    const arquivo = path.join(diretorioTemporario, 'bens.csv');
    const cabecalhos = [
      ...Object.values(seedConfig.colunas),
      ...seedConfig.colunasDadosComplementaresPai,
      'FABRICANTE',
    ];
    const valores = [
      '7695',
      'Quadro da bomba',
      'ABR-EAT-E-001',
      'EEAT Bela Vista',
      'Abreu e Lima',
      'Bela Vista, s/n',
      '-7,91062',
      '-34,8992',
      'Operando',
      'ABR-EAT-E-001',
      'EEAT Bela Vista',
      'Recife',
      'Sede',
      'Pontual',
      'Fabricante exemplo',
    ];

    await writeFile(
      arquivo,
      `${cabecalhos.join(';')}\n${valores.join(';')}\n`,
      'utf8',
    );

    const resultado = await lerArquivoBens(arquivo);

    expect(resultado.avisos).toEqual([]);
    expect(resultado.linhas).toHaveLength(1);
    expect(resultado.linhas[0]).toMatchObject({
      numeroLinha: 2,
      idBem: '7695',
      nomeBem: 'Quadro da bomba',
      codigoUnicoInstalacao: 'ABR-EAT-E-001',
      nomeInstalacao: 'EEAT Bela Vista',
      municipio: 'Abreu e Lima',
      endereco: 'Bela Vista, s/n',
      latitude: -7.91062,
      longitude: -34.8992,
      condicaoOperacional: 'Operando',
    });
    expect(resultado.linhas[0].dadosOriginais.FABRICANTE).toBe(
      'Fabricante exemplo',
    );
  });

  it('lê XLSX e reporta coordenadas inválidas sem inventar um valor', async () => {
    const arquivo = path.join(diretorioTemporario, 'bens.xlsx');
    const workbook = new ExcelJS.Workbook();
    const planilha = workbook.addWorksheet('Bens');
    planilha.addRow([
      ...Object.values(seedConfig.colunas),
      ...seedConfig.colunasDadosComplementaresPai,
      'FABRICANTE',
    ]);
    planilha.addRow([
      '7695',
      'Quadro da bomba',
      'ABR-EAT-E-001',
      'EEAT Bela Vista',
      'Abreu e Lima',
      'Bela Vista, s/n',
      '-7.91062',
      'coordenada inválida',
      'Operando',
      'ABR-EAT-E-001',
      'EEAT Bela Vista',
      'Recife',
      'Sede',
      'Pontual',
      'Fabricante exemplo',
    ]);
    await workbook.xlsx.writeFile(arquivo);

    const resultado = await lerArquivoBens(arquivo);

    expect(resultado.linhas).toHaveLength(1);
    expect(resultado.linhas[0].latitude).toBe(-7.91062);
    expect(resultado.linhas[0].longitude).toBeNull();
    expect(resultado.avisos).toEqual([
      {
        numeroLinha: 2,
        coluna: seedConfig.colunas.longitude,
        valor: 'coordenada inválida',
        motivo: 'Valor não numérico; coordenada tratada como ausente.',
      },
    ]);
    expect(resultado.linhas[0].dadosOriginais.FABRICANTE).toBe(
      'Fabricante exemplo',
    );
  });

  it('informa cabeçalhos obrigatórios ausentes', async () => {
    const arquivo = path.join(diretorioTemporario, 'bens.csv');
    await writeFile(arquivo, 'ID_BEM;NOME_BEM\n7695;Quadro\n', 'utf8');

    await expect(lerArquivoBens(arquivo)).rejects.toThrow(
      'Colunas obrigatórias ausentes na planilha:',
    );
  });

  it('rejeita extensões não suportadas', async () => {
    const arquivo = path.join(diretorioTemporario, 'bens.txt');
    await writeFile(arquivo, 'conteúdo', 'utf8');

    await expect(lerArquivoBens(arquivo)).rejects.toThrow(
      'Use um arquivo .csv ou .xlsx.',
    );
  });
});
