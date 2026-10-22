import { normalizarTexto } from '../normalizar-texto';
import type {
  GrupoInstalacao,
} from './agrupador-instalacoes';

export interface MunicipioDominio {
  id: number;
  nome: string;
  nome_normalizado: string;
}

export interface GrupoComMunicipio extends GrupoInstalacao {
  municipioId: number;
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

export function associarMunicipios(
  grupos: GrupoInstalacao[],
  municipios: MunicipioDominio[],
): GrupoComMunicipio[] {
  const indiceMunicipios = criarIndiceMunicipios(municipios);
  const erros: string[] = [];
  const gruposAssociados: GrupoComMunicipio[] = [];

  for (const grupo of grupos) {
    const municipiosDoGrupo = new Map<number, string>();

    for (const equipamento of grupo.equipamentos) {
      const municipioNormalizado = normalizarTexto(equipamento.municipio);
      const municipio = indiceMunicipios.get(municipioNormalizado);

      if (!municipio) {
        erros.push(
          `Instalação "${grupo.codigoUnicoInstalacao}", linha ${equipamento.numeroLinha}: município "${equipamento.municipio}" não encontrado na tabela de domínio.`,
        );
        continue;
      }

      municipiosDoGrupo.set(municipio.id, municipio.nome);
    }

    if (municipiosDoGrupo.size > 1) {
      const nomes = Array.from(municipiosDoGrupo.values()).join(', ');
      erros.push(
        `Instalação "${grupo.codigoUnicoInstalacao}" está associada a mais de um município: ${nomes}.`,
      );
      continue;
    }

    const municipioId = municipiosDoGrupo.keys().next().value;
    if (municipioId === undefined) continue;

    gruposAssociados.push({ ...grupo, municipioId });
  }

  if (erros.length > 0) {
    throw new Error(`Associação de municípios falhou:\n- ${erros.join('\n- ')}`);
  }

  return gruposAssociados;
}
