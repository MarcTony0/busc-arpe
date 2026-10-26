import type {
  GrupoComMunicipio,
  PendenciaAssociacaoMunicipio,
} from './associador-municipios';

export interface ResultadoSeparacaoColisoes {
  gruposValidos: GrupoComMunicipio[];
  pendencias: PendenciaAssociacaoMunicipio[];
}

interface OcorrenciaCodigo {
  grupo: GrupoComMunicipio;
  linha: number;
  ehPai: boolean;
  municipioInformado: string;
}

export function separarColisoesCodigo(
  grupos: GrupoComMunicipio[],
): ResultadoSeparacaoColisoes {
  const pendencias: PendenciaAssociacaoMunicipio[] = [];
  const mapaCodigos = new Map<string, OcorrenciaCodigo[]>();
  const gruposComErro = new Set<GrupoComMunicipio>();
  const motivosPorGrupo = new Map<GrupoComMunicipio, Map<number, string>>();
  const motivoPadraoPorGrupo = new Map<GrupoComMunicipio, string>();

  const registrarMotivoLinha = (
    grupo: GrupoComMunicipio,
    linha: number,
    motivo: string,
  ): void => {
    gruposComErro.add(grupo);
    if (!motivosPorGrupo.has(grupo)) {
      motivosPorGrupo.set(grupo, new Map());
    }
    motivosPorGrupo.get(grupo)!.set(linha, motivo);
    if (!motivoPadraoPorGrupo.has(grupo)) {
      motivoPadraoPorGrupo.set(grupo, motivo);
    }
  };

  const registrarMotivoGrupo = (
    grupo: GrupoComMunicipio,
    motivo: string,
  ): void => {
    gruposComErro.add(grupo);
    if (!motivoPadraoPorGrupo.has(grupo)) {
      motivoPadraoPorGrupo.set(grupo, motivo);
    }
  };

  // 1ª passada: registrar códigos e validar consistência interna de cada grupo
  for (const grupo of grupos) {
    const codInstalacao = grupo.codigoUnicoInstalacao.trim();

    if (!codInstalacao) {
      registrarMotivoGrupo(
        grupo,
        'Código da instalação vazio ou não informado.',
      );
      continue;
    }

    const ocorrenciasPai = mapaCodigos.get(codInstalacao) ?? [];
    ocorrenciasPai.push({
      grupo,
      linha: 0,
      ehPai: true,
      municipioInformado: grupo.equipamentos[0]?.municipio ?? '',
    });
    mapaCodigos.set(codInstalacao, ocorrenciasPai);

    const codigosFilhosNoGrupo = new Set<string>();

    for (const equip of grupo.equipamentos) {
      const codBem = equip.idBem.trim();
      if (!codBem) {
        registrarMotivoLinha(
          grupo,
          equip.numeroLinha,
          `Linha ${equip.numeroLinha}: ID_BEM é obrigatório.`,
        );
        continue;
      }

      if (codBem === codInstalacao) {
        registrarMotivoLinha(
          grupo,
          equip.numeroLinha,
          `Colisão de código único: ID_BEM coincide com o código da instalação pai ("${codBem}").`,
        );
      } else if (codigosFilhosNoGrupo.has(codBem)) {
        registrarMotivoLinha(
          grupo,
          equip.numeroLinha,
          `Colisão de código único: ID_BEM duplicado no mesmo grupo ("${codBem}").`,
        );
      }
      codigosFilhosNoGrupo.add(codBem);

      const ocorrenciasFilho = mapaCodigos.get(codBem) ?? [];
      ocorrenciasFilho.push({
        grupo,
        linha: equip.numeroLinha,
        ehPai: false,
        municipioInformado: equip.municipio,
      });
      mapaCodigos.set(codBem, ocorrenciasFilho);
    }
  }

  // 2ª passada: verificar colisões entre ocorrências de códigos repetidos
  for (const [codigo, ocorrencias] of mapaCodigos.entries()) {
    if (ocorrencias.length > 1) {
      for (const oc of ocorrencias) {
        if (oc.ehPai) {
          const outrasInstalacoes = ocorrencias
            .filter((o) => o !== oc)
            .map((o) =>
              o.ehPai
                ? `instalação ${o.grupo.codigoUnicoInstalacao}`
                : `equipamento da linha ${o.linha}`,
            )
            .join(', ');
          registrarMotivoGrupo(
            oc.grupo,
            `Colisão de código único da instalação "${codigo}" com ${outrasInstalacoes}.`,
          );
          continue;
        }

        if (!motivosPorGrupo.has(oc.grupo)) {
          motivosPorGrupo.set(oc.grupo, new Map());
        }
        const mapaLinhas = motivosPorGrupo.get(oc.grupo)!;
        if (!mapaLinhas.has(oc.linha)) {
          const outras = ocorrencias
            .filter((o) => o !== oc)
            .map((o) =>
              o.ehPai
                ? `instalação pai "${o.grupo.codigoUnicoInstalacao}"`
                : `linha ${o.linha}`,
            )
            .join(', ');
          registrarMotivoLinha(
            oc.grupo,
            oc.linha,
            `Colisão de código único: código "${codigo}" duplicado com ${outras}.`,
          );
        }
      }
    }
  }

  // 3ª passada: separar grupos válidos e montar pendências
  const gruposValidos: GrupoComMunicipio[] = [];

  for (const grupo of grupos) {
    if (!gruposComErro.has(grupo)) {
      gruposValidos.push(grupo);
      continue;
    }

    const motivosLinhas = motivosPorGrupo.get(grupo) ?? new Map();
    const motivoPadrao =
      motivoPadraoPorGrupo.get(grupo) ??
      'Instalação adiada por colisão de código único.';

    for (const equip of grupo.equipamentos) {
      const motivoLinha =
        motivosLinhas.get(equip.numeroLinha) ??
        `Instalação adiada por colisão de código único: ${motivoPadrao}`;

      pendencias.push({
        codigoUnicoInstalacao: grupo.codigoUnicoInstalacao,
        numeroLinha: equip.numeroLinha,
        municipioInformado: equip.municipio,
        motivo: motivoLinha,
      });
    }
  }

  return { gruposValidos, pendencias };
}
