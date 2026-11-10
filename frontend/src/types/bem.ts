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
