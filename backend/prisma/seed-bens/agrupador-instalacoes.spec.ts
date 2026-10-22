import { describe, expect, it } from '@jest/globals';
import {
  SituacaoBem,
  TipoSistema,
} from '../../generated/prisma/enums';
import type { LinhaBemPlanilha } from './arquivo-reader';
import {
  agruparInstalacoes,
  derivarSituacaoPai,
} from './agrupador-instalacoes';

function criarLinha(
  alteracoes: Partial<LinhaBemPlanilha> = {},
): LinhaBemPlanilha {
  return {
    numeroLinha: 2,
    idBem: '7695',
    nomeBem: 'Quadro da bomba',
    codigoUnicoInstalacao: 'ABR-EAT-E-001',
    nomeInstalacao: 'EEAT Bela Vista',
    municipio: 'Abreu e Lima',
    endereco: 'Bela Vista, s/n',
    latitude: -7.9,
    longitude: -34.9,
    condicaoOperacional: 'Operando',
    dadosOriginais: {},
    ...alteracoes,
  };
}

describe('agruparInstalacoes', () => {
  it('agrupa equipamentos e calcula a média usando apenas coordenadas completas', () => {
    const resultado = agruparInstalacoes([
      criarLinha({ latitude: -7, longitude: -34 }),
      criarLinha({
        numeroLinha: 3,
        idBem: '7696',
        latitude: -8,
        longitude: -35,
      }),
      criarLinha({
        numeroLinha: 4,
        idBem: '7697',
        latitude: -9,
        longitude: null,
      }),
    ]);

    expect(resultado.avisos).toEqual([]);
    expect(resultado.grupos).toHaveLength(1);
    expect(resultado.grupos[0]).toMatchObject({
      codigoUnicoInstalacao: 'ABR-EAT-E-001',
      categoria: 'EAT',
      tipoSistema: TipoSistema.SAA,
      latitude: -7.5,
      longitude: -34.5,
    });
    expect(resultado.grupos[0].equipamentos).toHaveLength(3);
  });

  it('classifica siglas conhecidas e mantém uma sigla desconhecida como N/I', () => {
    const resultado = agruparInstalacoes([
      criarLinha({ codigoUnicoInstalacao: 'ABR-DAT-E-001' }),
      criarLinha({ codigoUnicoInstalacao: 'ABR-EEE-E-001' }),
      criarLinha({ codigoUnicoInstalacao: 'ABR-XYZ-E-001' }),
    ]);

    expect(resultado.grupos).toMatchObject([
      { categoria: 'DAT', tipoSistema: TipoSistema.SAA },
      { categoria: 'EEE', tipoSistema: TipoSistema.SES },
      { categoria: 'XYZ', tipoSistema: TipoSistema.NAO_INFORMADO },
    ]);
    expect(resultado.avisos).toEqual([
      {
        codigoUnicoInstalacao: 'ABR-XYZ-E-001',
        motivo:
          'Sigla "XYZ" não mapeada; tipo de sistema definido como N/I.',
      },
    ]);
  });

  it('reporta código sem sigla no segundo bloco como N/I', () => {
    const resultado = agruparInstalacoes([
      criarLinha({ codigoUnicoInstalacao: 'ABR--001' }),
    ]);

    expect(resultado.grupos[0]).toMatchObject({
      categoria: 'N/I',
      tipoSistema: TipoSistema.NAO_INFORMADO,
    });
    expect(resultado.avisos).toEqual([
      {
        codigoUnicoInstalacao: 'ABR--001',
        motivo:
          'Código sem sigla no segundo bloco; categoria e sistema definidos como N/I.',
      },
    ]);
  });

  it('reporta grupos sem nenhum par de coordenadas válidas', () => {
    const resultado = agruparInstalacoes([
      criarLinha({ latitude: -7.9, longitude: null }),
    ]);

    expect(resultado.grupos[0]).toMatchObject({
      latitude: null,
      longitude: null,
    });
    expect(resultado.avisos).toEqual([
      {
        codigoUnicoInstalacao: 'ABR-EAT-E-001',
        motivo:
          'Nenhum equipamento do grupo possui latitude e longitude válidas; coordenadas do pai ausentes.',
      },
    ]);
  });

  it('deriva Operando quando pelo menos um equipamento está operando', () => {
    const resultado = agruparInstalacoes([
      criarLinha({
        condicaoOperacional: 'Inoperante (desativado/abandonado/obsoleto)',
      }),
      criarLinha({
        numeroLinha: 3,
        condicaoOperacional: 'OPERANDO',
      }),
    ]);

    expect(resultado.grupos[0].situacao).toBe(SituacaoBem.OPERANDO);
  });

  it('deriva Inoperante quando todos os equipamentos estão inoperantes', () => {
    const resultado = agruparInstalacoes([
      criarLinha({
        condicaoOperacional: 'Inoperante (desativado/abandonado/obsoleto)',
      }),
      criarLinha({
        numeroLinha: 3,
        condicaoOperacional: 'INOPERANTE',
      }),
    ]);

    expect(resultado.grupos[0].situacao).toBe(SituacaoBem.INOPERANTE);
  });

  it('interrompe o processamento para condição vazia ou desconhecida', () => {
    expect(() =>
      derivarSituacaoPai([
        criarLinha({
          condicaoOperacional: 'condição pendente',
        }),
      ]),
    ).toThrow(
      'Condição operacional vazia ou não reconhecida para CONDICAO_OPERACIONAL: linha 2: "condição pendente".',
    );

    expect(() =>
      derivarSituacaoPai([criarLinha({ condicaoOperacional: '' })]),
    ).toThrow('(vazio)');
  });

  it('interrompe o agrupamento quando a linha não tem código de instalação', () => {
    expect(() =>
      agruparInstalacoes([
        criarLinha({ codigoUnicoInstalacao: ' ' }),
      ]),
    ).toThrow(
      'Linha 2: CODIGO_UNICO_INSTALACAO é obrigatório para agrupar equipamentos.',
    );
  });

  it('devolve uma lista vazia quando não há linhas para agrupar', () => {
    expect(agruparInstalacoes([])).toEqual({ grupos: [], avisos: [] });
  });
});
