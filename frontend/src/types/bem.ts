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
  municipio: MunicipioResumo;
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
}

export const FILTROS_INICIAIS: FiltrosEstado = {
  mrae: TODOS,
  geres: TODOS,
  municipio: TODOS,
  sistema: TODOS,
  categoria: TODOS,
  situacao: TODOS,
};
