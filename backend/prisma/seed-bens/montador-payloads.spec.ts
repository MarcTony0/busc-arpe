import { describe, expect, it } from '@jest/globals';
import { SituacaoBem, TipoSistema } from '../../src/generated/prisma/enums';
import type { LinhaBemPlanilha } from './arquivo-reader';
import { agruparInstalacoes } from './agrupador-instalacoes';
import {
  associarMunicipios,
  type MunicipioDominio,
} from './associador-municipios';
import { montarPayloadsBem } from './montador-payloads';

const municipio: MunicipioDominio = {
  id: 12,
  nome: 'Abreu e Lima',
  nome_normalizado: 'abreu e lima',
};

function criarLinha(
  alteracoes: Partial<LinhaBemPlanilha> = {},
): LinhaBemPlanilha {
  const linha: LinhaBemPlanilha = {
    numeroLinha: 2,
    idBem: '7695',
    nomeBem: 'Motor 1',
    codigoUnicoInstalacao: 'ABR-EAT-E-001',
    nomeInstalacao: 'EEAT São João',
    municipio: 'Abreu e Lima',
    endereco: 'Rua Água Branca',
    latitude: -7.9,
    longitude: -34.9,
    condicaoOperacional: 'Operando',
    dadosOriginais: {},
  };

  linha.dadosOriginais = {
    ID_BEM: linha.idBem,
    NOME_BEM: linha.nomeBem,
    ID_ATIVO_PAI: 'ATIVO-001',
    NOME_ATIVO_PAI: 'EEAT São João',
    TIPO_BEM: 'Visível',
    SERVICO: 'N/I',
    CODIGO_UNICO_INSTALACAO: linha.codigoUnicoInstalacao,
    NOME_INSTALACAO: linha.nomeInstalacao,
    MICRORREGIAO: 'Recife',
    SISTEMA: 'Sede',
    SISTEMA_UNIDADE: 'Pontual',
    MUNICIPIO: linha.municipio,
    ENDERECO: linha.endereco,
    LATITUDE: linha.latitude,
    LONGITUDE: linha.longitude,
    CONDICAO_OPERACIONAL: linha.condicaoOperacional,
    FABRICANTE: 'Wég',
  };

  return {
    ...linha,
    ...alteracoes,
    dadosOriginais: {
      ...linha.dadosOriginais,
      ...alteracoes.dadosOriginais,
    },
  };
}

function prepararGrupos(linhas: LinhaBemPlanilha[]) {
  const grupos = agruparInstalacoes(linhas).grupos;
  return associarMunicipios(grupos, [municipio]).gruposAssociados;
}

describe('montarPayloadsBem', () => {
  it.each([
    'Ativo Ausente (inexistente)',
    'Ativo Ausente (manutencao)',
    'Nao Instalado',
    'Nunca operou',
  ])(
    'classifica "%s" como inoperante e preserva a condição original',
    (condicaoOperacional) => {
      const [payload] = montarPayloadsBem(
        prepararGrupos([
          criarLinha({
            condicaoOperacional,
            dadosOriginais: { CONDICAO_OPERACIONAL: condicaoOperacional },
          }),
        ]),
      );

      expect(payload.pai.situacao).toBe(SituacaoBem.INOPERANTE);
      expect(payload.filhos[0]).toMatchObject({
        situacao: SituacaoBem.INOPERANTE,
        dados_complementares: {
          CONDICAO_OPERACIONAL: condicaoOperacional,
        },
      });
    },
  );

  it.each(['N/I', 'Outro'])(
    'mapeia "%s" para situacao N/I e preserva a condição original',
    (condicaoOperacional) => {
      const [payload] = montarPayloadsBem(
        prepararGrupos([
          criarLinha({
            condicaoOperacional,
            dadosOriginais: { CONDICAO_OPERACIONAL: condicaoOperacional },
          }),
        ]),
      );

      expect(payload.pai.situacao).toBe(SituacaoBem.NAO_INFORMADO);
      expect(payload.filhos[0]).toMatchObject({
        situacao: SituacaoBem.NAO_INFORMADO,
        dados_complementares: {
          CONDICAO_OPERACIONAL: condicaoOperacional,
        },
      });
    },
  );

  it('separa os campos núcleo e os dados complementares dos pais e dos filhos', () => {
    const linhas = [
      criarLinha(),
      criarLinha({
        numeroLinha: 3,
        idBem: '7696',
        nomeBem: 'Motor 2',
        condicaoOperacional: 'Inoperante (desativado)',
        dadosOriginais: {
          ID_BEM: '7696',
          NOME_BEM: 'Motor 2',
          CONDICAO_OPERACIONAL: 'Inoperante (desativado)',
          FABRICANTE: 'Outra marca',
        },
      }),
    ];

    const [payload] = montarPayloadsBem(prepararGrupos(linhas));

    expect(payload.pai).toMatchObject({
      codigo_unico: 'ABR-EAT-E-001',
      nome: 'EEAT São João',
      endereco: 'Rua Água Branca',
      latitude: -7.9,
      longitude: -34.9,
      categoria: 'EAT',
      tipo_sistema: TipoSistema.SAA,
      situacao: SituacaoBem.OPERANDO,
      is_pai: true,
      municipio: { connect: { id: municipio.id } },
      dados_complementares: {
        ID_ATIVO_PAI: 'ATIVO-001',
        NOME_ATIVO_PAI: 'EEAT São João',
        MICRORREGIAO: 'Recife',
        SISTEMA: 'Sede',
        SISTEMA_UNIDADE: 'Pontual',
      },
      busca_texto:
        'abr-eat-e-001 eeat sao joao rua agua branca abreu e lima eat saa operando',
    });
    expect(payload.pai.dados_complementares).not.toHaveProperty('MUNICIPIO');
    expect(payload.pai.dados_complementares).not.toHaveProperty('ENDERECO');
    expect(payload.pai.dados_complementares).not.toHaveProperty(
      'CONDICAO_OPERACIONAL',
    );

    expect(payload.filhos).toHaveLength(2);
    expect(payload.filhos[0]).toMatchObject({
      codigo_unico: '7695',
      nome: 'Motor 1',
      endereco: null,
      categoria: 'EAT',
      tipo_sistema: TipoSistema.SAA,
      situacao: SituacaoBem.OPERANDO,
      is_pai: false,
      municipio: { connect: { id: municipio.id } },
      bem_pai: { connect: { codigo_unico: 'ABR-EAT-E-001' } },
      dados_complementares: {
        TIPO_BEM: 'Visível',
        SERVICO: 'N/I',
        CONDICAO_OPERACIONAL: 'Operando',
        FABRICANTE: 'Wég',
      },
      busca_texto: '7695 motor 1 visivel n/i operando weg',
    });
    expect(payload.filhos[0].dados_complementares).not.toHaveProperty(
      'ID_ATIVO_PAI',
    );
    expect(payload.filhos[0].dados_complementares).not.toHaveProperty(
      'NOME_INSTALACAO',
    );
    expect(payload.filhos[1].dados_complementares).toMatchObject({
      CONDICAO_OPERACIONAL: 'Inoperante (desativado)',
      FABRICANTE: 'Outra marca',
    });
    expect(payload.filhos[1].situacao).toBe(SituacaoBem.INOPERANTE);
  });

  it('interrompe se atributos repetidos da instalação divergirem entre equipamentos', () => {
    const linhas = [
      criarLinha(),
      criarLinha({
        numeroLinha: 3,
        idBem: '7696',
        nomeBem: 'Motor 2',
        dadosOriginais: {
          ID_BEM: '7696',
          NOME_BEM: 'Motor 2',
          NOME_ATIVO_PAI: 'Outro nome de ativo',
        },
      }),
    ];

    expect(() => montarPayloadsBem(prepararGrupos(linhas))).toThrow(
      'Instalação "ABR-EAT-E-001" possui valores inconsistentes para NOME_ATIVO_PAI nas linhas 2, 3.',
    );
  });

  it('rejeita identificadores de equipamentos vazios', () => {
    const grupo = prepararGrupos([criarLinha({ idBem: ' ' })]);

    expect(() => montarPayloadsBem(grupo)).toThrow(
      'Linha 2: ID_BEM é obrigatório.',
    );
  });

  it('rejeita códigos duplicados entre bens pais e filhos', () => {
    const linhas = [criarLinha({ codigoUnicoInstalacao: '7695' })];
    const grupo = prepararGrupos(linhas);

    expect(() => montarPayloadsBem(grupo)).toThrow(
      'Código único de bem duplicado: "7695" (linha 2).',
    );
  });

  it('rejeita valores de JSON complementar que não sejam escalares serializáveis', () => {
    const linhas = [
      criarLinha({
        dadosOriginais: {
          FABRICANTE: { nome: 'Marca' },
        },
      }),
    ];

    expect(() => montarPayloadsBem(prepararGrupos(linhas))).toThrow(
      'Valor não suportado para JSONB na coluna "FABRICANTE".',
    );
  });
});
