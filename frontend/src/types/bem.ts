export type TipoSistema = 'SAA' | 'SES' | 'NAO_INFORMADO';
export type SituacaoBem = 'OPERANDO' | 'INOPERANTE' | 'NAO_INFORMADO';

export interface MunicipioResumo {
  id: number;
  nome: string;
  geres: string;
  mrae: string;
}

export interface BemLeve {
  id: number;
  codigo_unico: string;
  nome: string;
  latitude: number | null;
  longitude: number | null;
  tipo_sistema: TipoSistema;
  situacao: SituacaoBem;
  categoria: string;
  concessionaria: string;
  visivel: boolean;
  municipio: MunicipioResumo;
  _count?: {
    filhos?: number;
    bensFilhos?: number;
  };
}

export interface BemFilhoResumo {
  id: number;
  codigo_unico: string;
  nome: string;
  situacao: SituacaoBem;
  categoria: string;
  concessionaria?: string;
  visivel?: boolean;
  dados_complementares?: Record<string, unknown> | null;
}

export interface DocumentoResumo {
  id: number;
  nome: string;
  url: string;
  tipo: string | null;
}

export interface BemDetalhe {
  id: number;
  codigo_unico: string;
  nome: string;
  endereco: string | null;
  municipio_id: number;
  municipio: MunicipioResumo;
  latitude: number | null;
  longitude: number | null;
  categoria: string;
  tipo_sistema: TipoSistema;
  situacao: SituacaoBem;
  concessionaria: string;
  visivel: boolean;
  is_pai: boolean;
  dados_complementares?: Record<string, unknown> | null;
  filhos: BemFilhoResumo[];
  documentos: DocumentoResumo[];
  createdAt: string;
  updatedAt: string;
}

export interface FiltrosResponse {
  mraes: string[];
  geres: string[];
  municipios: MunicipioResumo[];
  sistemas: string[];
  categorias: string[];
  situacoes: string[];
}

export const PERNAMBUCO_CENTER: [number, number] = [-8.4, -37.6];
export const PERNAMBUCO_ZOOM = 7;

export const TODOS = 'TODOS';

export interface FiltrosEstado {
  mrae: string;
  geres: string;
  municipio: string;
  sistema: string;
  categoria: string;
  situacao: string;
  concessionaria: string;
  visibilidade: string;
}

export const FILTROS_INICIAIS: FiltrosEstado = {
  mrae: TODOS,
  geres: TODOS,
  municipio: TODOS,
  sistema: TODOS,
  categoria: TODOS,
  situacao: TODOS,
  concessionaria: TODOS,
  visibilidade: TODOS,
};

export const RD_NOMES_LIMPOS: Record<string, string> = {
  I: 'Metropolitana',
  II: 'Mata Norte',
  III: 'Mata Sul',
  IV: 'Agreste Central',
  V: 'Agreste Meridional',
  VI: 'Sertão do Moxotó',
  VII: 'Sertão Central',
  VIII: 'Sertão de São Francisco',
  IX: 'Araripe',
  X: 'Pajeú',
  XI: 'Itaparica',
  XII: 'Agreste Setentrional',
};

export const RD_NOMES: Record<string, string> = {
  I: 'I - Metropolitana',
  II: 'II - Mata Norte',
  III: 'III - Mata Sul',
  IV: 'IV - Agreste Central',
  V: 'V - Agreste Meridional',
  VI: 'VI - Sertão do Moxotó',
  VII: 'VII - Sertão Central',
  VIII: 'VIII - Sertão de São Francisco',
  IX: 'IX - Araripe',
  X: 'X - Pajeú',
  XI: 'XI - Itaparica',
  XII: 'XII - Agreste Setentrional',
};

export function extrairCodigoRD(valor?: string | null): string {
  if (!valor) return '';
  const limpo = valor
    .replace(/GERES/gi, '')
    .replace(/RD/gi, '')
    .split('-')[0]
    .trim()
    .toUpperCase();
  return limpo;
}

export function formatarRD(valor?: string | null): string {
  if (!valor) return 'Não informado';
  const codigo = extrairCodigoRD(valor);
  return RD_NOMES[codigo] || valor;
}

export function obterNomeLimpoRD(valor?: string | null): string {
  if (!valor) return '';
  const codigo = extrairCodigoRD(valor);
  return RD_NOMES_LIMPOS[codigo] || valor;
}
