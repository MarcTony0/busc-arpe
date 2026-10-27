import { describe, expect, it } from '@jest/globals';
import { SituacaoBem } from '../../src/generated/prisma/enums';
import { agruparInstalacoes } from './agrupador-instalacoes';
import {
  associarMunicipios,
  type MunicipioDominio,
} from './associador-municipios';
import type { LinhaBemPlanilha } from './arquivo-reader';
import { montarIndicesBusca } from './indice-busca';

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
    dadosOriginais: {
      ID_BEM: '7695',
      NOME_BEM: 'Quadro da bomba',
      FABRICANTE: 'Fabricante exclusivo do equipamento',
    },
    ...alteracoes,
  };
}

describe('montarIndicesBusca', () => {
  it('normaliza o índice do pai e não inclui valores exclusivos dos filhos', () => {
    const grupo = agruparInstalacoes([
      criarLinha({
        nomeInstalacao: 'EEAT São João',
        endereco: 'Rua Água Branca',
        municipio: 'Abreu e Lima',
        dadosOriginais: {
          ID_BEM: '7695',
          NOME_BEM: 'Motor da bomba',
          FABRICANTE: 'Fabricante exclusivo do equipamento',
        },
      }),
    ]).grupos;
    const municipios: MunicipioDominio[] = [
      {
        id: 1,
        nome: 'Abreu e Lima',
        nome_normalizado: 'abreu e lima',
      },
    ];
    const gruposAssociados = associarMunicipios(
      grupo,
      municipios,
    ).gruposAssociados;

    const indices = montarIndicesBusca(gruposAssociados);

    expect(indices.pais).toEqual([
      {
        codigoUnicoInstalacao: 'ABR-EAT-E-001',
        buscaTexto:
          'abr-eat-e-001 eeat sao joao rua agua branca abreu e lima eat saa operando',
      },
    ]);
    expect(indices.pais[0].buscaTexto).not.toContain('motor da bomba');
    expect(indices.pais[0].buscaTexto).not.toContain(
      'fabricante exclusivo do equipamento',
    );
  });

  it('mantém um índice independente com os dados próprios de cada filho', () => {
    const grupos = agruparInstalacoes([
      criarLinha({
        idBem: '7695',
        dadosOriginais: {
          ID_BEM: '7695',
          NOME_BEM: 'Motor 1',
          FABRICANTE: 'Wég',
        },
      }),
      criarLinha({
        numeroLinha: 3,
        idBem: '7696',
        dadosOriginais: {
          ID_BEM: '7696',
          NOME_BEM: 'Motor 2',
          FABRICANTE: 'Outra marca',
        },
      }),
    ]).grupos;
    const municipios: MunicipioDominio[] = [
      {
        id: 1,
        nome: 'Abreu e Lima',
        nome_normalizado: 'abreu e lima',
      },
    ];
    const gruposAssociados = associarMunicipios(
      grupos,
      municipios,
    ).gruposAssociados;

    const indices = montarIndicesBusca(gruposAssociados);

    expect(indices.filhos).toEqual([
      {
        codigoUnicoBem: '7695',
        buscaTexto: '7695 motor 1 weg',
      },
      {
        codigoUnicoBem: '7696',
        buscaTexto: '7696 motor 2 outra marca',
      },
    ]);
  });

  it('inclui N/I no índice de busca do pai quando essa for a situação derivada', () => {
    const grupos = agruparInstalacoes([
      criarLinha({
        condicaoOperacional: 'N/I',
        dadosOriginais: { CONDICAO_OPERACIONAL: 'N/I' },
      }),
    ]).grupos;
    const municipios: MunicipioDominio[] = [
      {
        id: 1,
        nome: 'Abreu e Lima',
        nome_normalizado: 'abreu e lima',
      },
    ];
    const gruposAssociados = associarMunicipios(
      grupos,
      municipios,
    ).gruposAssociados;

    expect(grupos[0]?.situacao).toBe(SituacaoBem.NAO_INFORMADO);
    expect(montarIndicesBusca(gruposAssociados).pais[0]?.buscaTexto).toContain(
      'n/i',
    );
  });
});
