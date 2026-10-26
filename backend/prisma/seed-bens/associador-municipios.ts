import { normalizarTexto } from '../normalizar-texto';
import type { GrupoInstalacao } from './agrupador-instalacoes';

export interface MunicipioDominio {
  id: number;
  nome: string;
  nome_normalizado: string;
}

export interface GrupoComMunicipio extends GrupoInstalacao {
  municipioId: number;
}

export interface PendenciaAssociacaoMunicipio {
  codigoUnicoInstalacao: string;
  numeroLinha: number;
  municipioInformado: string;
  motivo: string;
}

export interface ResultadoAssociacaoMunicipios {
  gruposAssociados: GrupoComMunicipio[];
  pendencias: PendenciaAssociacaoMunicipio[];
}

function criarIndiceMunicipios(
  municipios: MunicipioDominio[],
): Map<string, MunicipioDominio> {
  const indice = new Map<string, MunicipioDominio>();

  for (const municipio of municipios) {
    const nomeNormalizado = municipio.nome_normalizado.trim();
    if (!nomeNormalizado) {
      throw new Error(
        `Município de domínio sem nome_normalizado: "${municipio.nome}" (id ${municipio.id}).`,
      );
    }

    if (indice.has(nomeNormalizado)) {
      throw new Error(
        `Há mais de um município de domínio com nome_normalizado "${nomeNormalizado}".`,
      );
    }

    indice.set(nomeNormalizado, municipio);
  }

  return indice;
}

const ALIAS_MUNICIPIOS: Record<string, string> = {
  'ilha de itamaraca': 'itamaraca',
  'sao caitano': 'sao caetano',
  'belem de sao francisco': 'belem do sao francisco',
  'iguaraci': 'iguaracy',
};

function resolverMunicipio(
  nomeInformado: string,
  indice: Map<string, MunicipioDominio>,
): MunicipioDominio | undefined {
  const normalizado = normalizarTexto(nomeInformado);
  const nomeBusca = ALIAS_MUNICIPIOS[normalizado] ?? normalizado;
  return indice.get(nomeBusca);
}

export function associarMunicipios(
  grupos: GrupoInstalacao[],
  municipios: MunicipioDominio[],
): ResultadoAssociacaoMunicipios {
  const indiceMunicipios = criarIndiceMunicipios(municipios);
  const gruposAssociados: GrupoComMunicipio[] = [];
  const pendencias: PendenciaAssociacaoMunicipio[] = [];

  for (const grupo of grupos) {
    const municipiosDasLinhas = grupo.equipamentos.map((equipamento) => ({
      equipamento,
      municipio: resolverMunicipio(equipamento.municipio, indiceMunicipios),
    }));
    const municipiosDoGrupo = new Map<number, string>();
    for (const { municipio } of municipiosDasLinhas) {
      if (municipio) municipiosDoGrupo.set(municipio.id, municipio.nome);
    }

    const municipioDivergente = municipiosDoGrupo.size > 1;
    const semMunicipioValido = municipiosDoGrupo.size === 0;

    if (municipioDivergente || semMunicipioValido) {
      const nomesMunicipios = Array.from(municipiosDoGrupo.values()).join(', ');
      for (const { equipamento, municipio } of municipiosDasLinhas) {
        if (!municipio) {
          pendencias.push({
            codigoUnicoInstalacao: grupo.codigoUnicoInstalacao,
            numeroLinha: equipamento.numeroLinha,
            municipioInformado: equipamento.municipio,
            motivo: 'Município não encontrado na tabela de domínio.',
          });
        } else if (municipioDivergente) {
          pendencias.push({
            codigoUnicoInstalacao: grupo.codigoUnicoInstalacao,
            numeroLinha: equipamento.numeroLinha,
            municipioInformado: equipamento.municipio,
            motivo: `Instalação associada a municípios divergentes: ${nomesMunicipios}.`,
          });
        }
      }
      continue;
    }

    const municipioId = municipiosDoGrupo.keys().next().value;
    if (municipioId === undefined) {
      throw new Error(
        `Instalação "${grupo.codigoUnicoInstalacao}" não possui equipamentos com município.`,
      );
    }

    gruposAssociados.push({ ...grupo, municipioId });
  }

  return { gruposAssociados, pendencias };
}
