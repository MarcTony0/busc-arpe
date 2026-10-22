import { describe, expect, it } from '@jest/globals';
import type { GrupoInstalacao } from './agrupador-instalacoes';
import { agruparInstalacoes } from './agrupador-instalacoes';
import {
  associarMunicipios,
  type MunicipioDominio,
} from './associador-municipios';

function criarGrupo(
  municipios: string[],
  codigoUnicoInstalacao = 'ABR-EAT-E-001',
): GrupoInstalacao {
  const linhas = municipios.map((municipio, indice) => ({
    numeroLinha: indice + 2,
    idBem: String(7695 + indice),
    nomeBem: `Equipamento ${indice + 1}`,
    codigoUnicoInstalacao,
    nomeInstalacao: 'EEAT Bela Vista',
    municipio,
    endereco: 'Bela Vista, s/n',
    latitude: -7.9,
    longitude: -34.9,
    condicaoOperacional: 'Operando',
    dadosOriginais: {},
  }));

  return agruparInstalacoes(linhas).grupos[0];
}

describe('associarMunicipios', () => {
  it('associa por igualdade exata do nome normalizado', () => {
    const grupo = criarGrupo(['ÁGUA PRETA', 'Agua Preta']);
    const municipios: MunicipioDominio[] = [
      {
        id: 18,
        nome: 'Água Preta',
        nome_normalizado: 'agua preta',
      },
    ];

    const resultado = associarMunicipios([grupo], municipios);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].municipioId).toBe(18);
    expect(resultado[0].equipamentos).toHaveLength(2);
  });

  it('falha explicitamente quando um município não está na tabela de domínio', () => {
    const grupo = criarGrupo(['Município desconhecido']);

    expect(() => associarMunicipios([grupo], [])).toThrow(
      'município "Município desconhecido" não encontrado na tabela de domínio.',
    );
  });

  it('falha se os equipamentos de uma instalação apontarem para municípios diferentes', () => {
    const grupo = criarGrupo(['Abreu e Lima', 'Recife']);
    const municipios: MunicipioDominio[] = [
      {
        id: 1,
        nome: 'Abreu e Lima',
        nome_normalizado: 'abreu e lima',
      },
      {
        id: 2,
        nome: 'Recife',
        nome_normalizado: 'recife',
      },
    ];

    expect(() => associarMunicipios([grupo], municipios)).toThrow(
      'está associada a mais de um município: Abreu e Lima, Recife.',
    );
  });

  it('rejeita nomes normalizados duplicados na tabela de domínio', () => {
    const grupo = criarGrupo(['Recife']);
    const municipios: MunicipioDominio[] = [
      { id: 1, nome: 'Recife', nome_normalizado: 'recife' },
      { id: 2, nome: 'RECIFE', nome_normalizado: 'recife' },
    ];

    expect(() => associarMunicipios([grupo], municipios)).toThrow(
      'Há mais de um município de domínio com nome_normalizado "recife".',
    );
  });
});
