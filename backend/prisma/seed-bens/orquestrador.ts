import type { MunicipioDominio } from './associador-municipios';
import type { PendenciaAssociacaoMunicipio } from './associador-municipios';
import { associarMunicipios } from './associador-municipios';
import { agruparInstalacoes } from './agrupador-instalacoes';
import { lerArquivoBens, type AvisoLeitura } from './arquivo-reader';
import {
  montarPayloadsBem,
  separarInconsistenciasValores,
  type PayloadGrupoBem,
} from './montador-payloads';
import type { AvisoAgrupamento } from './agrupador-instalacoes';
import { separarColisoesCodigo } from './separador-colisoes';

export interface ResumoPreparacaoSeedBens {
  linhasLidas: number;
  bensPais: number;
  bensFilhos: number;
  avisosLeitura: AvisoLeitura[];
  avisosAgrupamento: AvisoAgrupamento[];
}

export interface PreparacaoSeedBens {
  payloads: PayloadGrupoBem[];
  pendenciasMunicipio: PendenciaAssociacaoMunicipio[];
  resumo: ResumoPreparacaoSeedBens;
}

export async function prepararSeedBens(
  arquivo: string,
  municipios: MunicipioDominio[],
): Promise<PreparacaoSeedBens> {
  const resultadoLeitura = await lerArquivoBens(arquivo);
  const resultadoAgrupamento = agruparInstalacoes(resultadoLeitura.linhas);
  const associacao = associarMunicipios(
    resultadoAgrupamento.grupos,
    municipios,
  );
  const separacaoColisoes = separarColisoesCodigo(associacao.gruposAssociados);
  const { gruposConsistentes, pendencias: pendenciasInconsistentes } =
    separarInconsistenciasValores(separacaoColisoes.gruposValidos);
  const payloads = montarPayloadsBem(gruposConsistentes);
  const pendenciasTotais = [
    ...associacao.pendencias,
    ...separacaoColisoes.pendencias,
    ...pendenciasInconsistentes,
  ];

  return {
    payloads,
    pendenciasMunicipio: pendenciasTotais,
    resumo: {
      linhasLidas: resultadoLeitura.linhas.length,
      bensPais: payloads.length,
      bensFilhos: payloads.reduce(
        (total, payload) => total + payload.filhos.length,
        0,
      ),
      avisosLeitura: resultadoLeitura.avisos,
      avisosAgrupamento: resultadoAgrupamento.avisos,
    },
  };
}
