import type { MunicipioDominio } from './associador-municipios';
import type { PendenciaAssociacaoMunicipio } from './associador-municipios';
import { associarMunicipios } from './associador-municipios';
import { agruparInstalacoes } from './agrupador-instalacoes';
import { lerArquivoBens, type AvisoLeitura } from './arquivo-reader';
import { montarPayloadsBem, type PayloadGrupoBem } from './montador-payloads';
import type { AvisoAgrupamento } from './agrupador-instalacoes';

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
  const payloads = montarPayloadsBem(associacao.gruposAssociados);

  return {
    payloads,
    pendenciasMunicipio: associacao.pendencias,
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
