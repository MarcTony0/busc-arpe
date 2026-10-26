import { describe, expect, it } from '@jest/globals';
import { SituacaoBem, TipoSistema } from '../../generated/prisma/enums';
import type { GrupoComMunicipio } from './associador-municipios';
import type { LinhaBemPlanilha } from './arquivo-reader';
import { separarColisoesCodigo } from './separador-colisoes';

function criarEquipamento(
  numeroLinha: number,
  idBem: string,
  codigoInstalacao = 'INST-001',
  municipio = 'Recife',
): LinhaBemPlanilha {
  return {
    numeroLinha,
    idBem,
    nomeBem: `Equipamento ${idBem}`,
    codigoUnicoInstalacao: codigoInstalacao,
    nomeInstalacao: `Instalação ${codigoInstalacao}`,
    municipio,
    endereco: 'Rua Principal',
    latitude: -8.0,
    longitude: -35.0,
    condicaoOperacional: 'Operando',
    dadosOriginais: {},
  };
}

function criarGrupo(
  codigoUnicoInstalacao: string,
  equipamentos: LinhaBemPlanilha[],
  municipioId = 1,
): GrupoComMunicipio {
  return {
    codigoUnicoInstalacao,
    equipamentos,
    municipioId,
    latitude: -8.0,
    longitude: -35.0,
    categoria: 'EAT',
    tipoSistema: TipoSistema.SAA,
    situacao: SituacaoBem.OPERANDO,
  };
}

describe('separarColisoesCodigo', () => {
  it('retorna todos os grupos como válidos quando não há colisões', () => {
    const grupos: GrupoComMunicipio[] = [
      criarGrupo('INST-001', [
        criarEquipamento(2, 'BEM-001', 'INST-001'),
        criarEquipamento(3, 'BEM-002', 'INST-001'),
      ]),
      criarGrupo('INST-002', [criarEquipamento(4, 'BEM-003', 'INST-002')]),
    ];

    const resultado = separarColisoesCodigo(grupos);

    expect(resultado.gruposValidos).toHaveLength(2);
    expect(resultado.pendencias).toHaveLength(0);
  });

  it('separa instalação quando o ID_BEM de um equipamento coincide com o código da instalação pai', () => {
    // Cenário idêntico ao ABR-EAT-E-001 da planilha oficial
    const grupos: GrupoComMunicipio[] = [
      criarGrupo('ABR-EAT-E-001', [
        criarEquipamento(10, 'BEM-001', 'ABR-EAT-E-001'),
        criarEquipamento(12545, 'ABR-EAT-E-001', 'ABR-EAT-E-001'),
      ]),
      criarGrupo('INST-VALIDA', [
        criarEquipamento(20, 'BEM-VAL-01', 'INST-VALIDA'),
      ]),
    ];

    const resultado = separarColisoesCodigo(grupos);

    expect(resultado.gruposValidos).toHaveLength(1);
    expect(resultado.gruposValidos[0]?.codigoUnicoInstalacao).toBe('INST-VALIDA');

    expect(resultado.pendencias).toHaveLength(2);
    const pendenciaColidente = resultado.pendencias.find(
      (p) => p.numeroLinha === 12545,
    );
    expect(pendenciaColidente?.motivo).toContain(
      'ID_BEM coincide com o código da instalação pai ("ABR-EAT-E-001")',
    );

    const pendenciaIrma = resultado.pendencias.find(
      (p) => p.numeroLinha === 10,
    );
    expect(pendenciaIrma?.motivo).toContain('Instalação adiada por colisão');
  });

  it('separa instalação quando há IDs de bem duplicados no mesmo grupo', () => {
    const grupos: GrupoComMunicipio[] = [
      criarGrupo('INST-001', [
        criarEquipamento(2, 'BEM-REP', 'INST-001'),
        criarEquipamento(3, 'BEM-REP', 'INST-001'),
      ]),
    ];

    const resultado = separarColisoesCodigo(grupos);

    expect(resultado.gruposValidos).toHaveLength(0);
    expect(resultado.pendencias).toHaveLength(2);
    expect(resultado.pendencias[1]?.motivo).toContain(
      'ID_BEM duplicado no mesmo grupo ("BEM-REP")',
    );
  });

  it('separa ambas as instalações quando um ID_BEM é compartilhado entre grupos diferentes', () => {
    const grupos: GrupoComMunicipio[] = [
      criarGrupo('INST-A', [criarEquipamento(10, 'BEM-COMP', 'INST-A')]),
      criarGrupo('INST-B', [criarEquipamento(20, 'BEM-COMP', 'INST-B')]),
      criarGrupo('INST-C', [criarEquipamento(30, 'BEM-OK', 'INST-C')]),
    ];

    const resultado = separarColisoesCodigo(grupos);

    expect(resultado.gruposValidos).toHaveLength(1);
    expect(resultado.gruposValidos[0]?.codigoUnicoInstalacao).toBe('INST-C');
    expect(resultado.pendencias).toHaveLength(2);
    expect(resultado.pendencias[0]?.motivo).toContain('código "BEM-COMP" duplicado');
    expect(resultado.pendencias[1]?.motivo).toContain('código "BEM-COMP" duplicado');
  });

  it('separa instalação com ID_BEM vazio', () => {
    const grupos: GrupoComMunicipio[] = [
      criarGrupo('INST-001', [criarEquipamento(5, '   ', 'INST-001')]),
    ];

    const resultado = separarColisoesCodigo(grupos);

    expect(resultado.gruposValidos).toHaveLength(0);
    expect(resultado.pendencias).toHaveLength(1);
    expect(resultado.pendencias[0]?.motivo).toContain('ID_BEM é obrigatório');
  });
});
