import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { SituacaoBem, TipoSistema } from '../../src/generated/prisma/enums';
import { seedConfig } from '../seed-config';
import { prepararSeedBens, type PreparacaoSeedBens } from './orquestrador';

const municipio = {
  id: 12,
  nome: 'Abreu e Lima',
  nome_normalizado: 'abreu e lima',
};

describe('prepararSeedBens', () => {
  let diretorioTemporario: string;

  beforeEach(async () => {
    diretorioTemporario = await mkdtemp(
      path.join(os.tmpdir(), 'buscarpe-seed-orquestrador-'),
    );
  });

  afterEach(async () => {
    await rm(diretorioTemporario, { recursive: true, force: true });
  });

  it('integra leitura, agrupamento, associação e payloads sem acessar o banco', async () => {
    const arquivo = path.join(diretorioTemporario, 'bens.csv');
    const cabecalhos = [
      ...Object.values(seedConfig.colunas),
      ...seedConfig.colunasDadosComplementaresPai,
      'FABRICANTE',
    ];
    const linhas = [
      [
        '7695',
        'Motor 1',
        'ABR-EAT-E-001',
        'EEAT Bela Vista',
        'Abreu e Lima',
        'Rua Bela Vista',
        '-7,9',
        '-34,9',
        'Operando',
        'ATIVO-001',
        'EEAT Bela Vista',
        'Recife',
        'Sede',
        'Pontual',
        'Fabricante A',
      ],
      [
        '7696',
        'Motor 2',
        'ABR-EAT-E-001',
        'EEAT Bela Vista',
        'Abreu e Lima',
        'Rua Bela Vista',
        '-8,1',
        '-35,1',
        'Inoperante (desativado)',
        'ATIVO-001',
        'EEAT Bela Vista',
        'Recife',
        'Sede',
        'Pontual',
        'Fabricante B',
      ],
    ];
    const conteudo = [cabecalhos, ...linhas]
      .map((linha) => linha.join(';'))
      .join('\n');
    await writeFile(arquivo, conteudo, 'utf8');

    const resultado: PreparacaoSeedBens = await prepararSeedBens(arquivo, [
      municipio,
    ]);

    expect(resultado.resumo).toEqual({
      linhasLidas: 2,
      bensPais: 1,
      bensFilhos: 2,
      avisosLeitura: [],
      avisosAgrupamento: [],
    });
    expect(resultado.pendenciasMunicipio).toEqual([]);
    expect(resultado.payloads[0]?.pai).toMatchObject({
      codigo_unico: 'ABR-EAT-E-001',
      tipo_sistema: TipoSistema.SAA,
      situacao: SituacaoBem.OPERANDO,
      latitude: -8,
      longitude: -35,
      municipio: { connect: { id: municipio.id } },
    });
    expect(resultado.payloads[0]?.filhos).toHaveLength(2);
    expect(resultado.payloads[0]?.filhos[1]).toMatchObject({
      codigo_unico: '7696',
      situacao: SituacaoBem.INOPERANTE,
      bem_pai: { connect: { codigo_unico: 'ABR-EAT-E-001' } },
    });
  });

  it('propaga avisos de leitura e de classificação para o resumo', async () => {
    const arquivo = path.join(diretorioTemporario, 'bens.csv');
    const cabecalhos = [
      ...Object.values(seedConfig.colunas),
      ...seedConfig.colunasDadosComplementaresPai,
    ];
    const valores = [
      '7695',
      'Motor',
      'ABR-XYZ-E-001',
      'Instalação',
      'Abreu e Lima',
      'Rua A',
      'latitude inválida',
      '-34,9',
      'Operando',
      'ATIVO-001',
      'Instalação',
      'Recife',
      'Sede',
      'Pontual',
    ];
    await writeFile(
      arquivo,
      `${cabecalhos.join(';')}\n${valores.join(';')}\n`,
      'utf8',
    );

    const resultado = await prepararSeedBens(arquivo, [municipio]);

    expect(resultado.resumo.avisosLeitura).toHaveLength(1);
    expect(resultado.resumo.avisosLeitura[0]).toMatchObject({
      coluna: seedConfig.colunas.latitude,
      valor: 'latitude inválida',
    });
    expect(resultado.resumo.avisosAgrupamento).toEqual(
      expect.arrayContaining([
        {
          codigoUnicoInstalacao: 'ABR-XYZ-E-001',
          motivo: 'Sigla "XYZ" não mapeada; tipo de sistema definido como N/I.',
        },
        {
          codigoUnicoInstalacao: 'ABR-XYZ-E-001',
          motivo:
            'Nenhum equipamento do grupo possui latitude e longitude válidas; coordenadas do pai ausentes.',
        },
      ]),
    );
    expect(resultado.payloads[0]?.pai.tipo_sistema).toBe(
      TipoSistema.NAO_INFORMADO,
    );
  });

  it('desvia instalações com colisão de código para pendências sem interromper o pipeline', async () => {
    const arquivo = path.join(diretorioTemporario, 'bens-colisao.csv');
    const cabecalhos = [
      ...Object.values(seedConfig.colunas),
      ...seedConfig.colunasDadosComplementaresPai,
    ];
    const linhas = [
      // Instalação com colisão: ID_BEM coincide com CODIGO_UNICO_INSTALACAO
      [
        'ABR-EAT-E-001',
        'Equipamento colidente',
        'ABR-EAT-E-001',
        'EEAT Bela Vista',
        'Abreu e Lima',
        'Rua Bela Vista',
        '-7,9',
        '-34,9',
        'Operando',
        'ATIVO-001',
        'EEAT Bela Vista',
        'Recife',
        'Sede',
        'Pontual',
      ],
      // Instalação válida
      [
        'VAL-001',
        'Equipamento Valido',
        'VAL-EAT-E-002',
        'EEAT Valida',
        'Abreu e Lima',
        'Rua Valida',
        '-7,9',
        '-34,9',
        'Operando',
        'ATIVO-002',
        'EEAT Valida',
        'Recife',
        'Sede',
        'Pontual',
      ],
    ];
    const conteudo = [cabecalhos, ...linhas]
      .map((linha) => linha.join(';'))
      .join('\n');
    await writeFile(arquivo, conteudo, 'utf8');

    const resultado = await prepararSeedBens(arquivo, [municipio]);

    expect(resultado.payloads).toHaveLength(1);
    expect(resultado.payloads[0]?.pai.codigo_unico).toBe('VAL-EAT-E-002');
    expect(resultado.pendenciasMunicipio).toHaveLength(1);
    expect(resultado.pendenciasMunicipio[0]?.codigoUnicoInstalacao).toBe(
      'ABR-EAT-E-001',
    );
    expect(resultado.pendenciasMunicipio[0]?.motivo).toContain(
      'ID_BEM coincide com o código da instalação pai',
    );
  });
});
