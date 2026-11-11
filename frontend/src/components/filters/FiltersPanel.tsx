'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import {
  TODOS,
  formatarRD,
  type FiltrosEstado,
  type FiltrosResponse,
} from '@/types/bem';

interface FiltersPanelProps {
  aberto: boolean;
  filtros: FiltrosEstado;
  opcoes: FiltrosResponse | null;
  onFechar: () => void;
  onChange: (novosFiltros: FiltrosEstado) => void;
  onRedefinir: () => void;
}

const selectClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/25';

interface SanfonaProps {
  titulo: string;
  valor: string;
  opcoes: Array<{ valor: string; rotulo: string }>;
  onChange: (v: string) => void;
}

function Sanfona({ titulo, valor, opcoes, onChange }: SanfonaProps) {
  const [aberta, setAberta] = useState(valor !== TODOS);
  const rotuloAtivo = opcoes.find((o) => o.valor === valor)?.rotulo ?? valor;

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setAberta(!aberta)}
        aria-expanded={aberta}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
          {titulo}
          {valor !== TODOS && <span className="ml-2 normal-case text-brand font-bold">· {rotuloAtivo}</span>}
        </span>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform duration-200 ${
            aberta ? 'rotate-180' : ''
          }`}
        />
      </button>

      {aberta && (
        <div className="px-4 pb-3">
          <select
            className={selectClass}
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            aria-label={titulo}
          >
            <option value={TODOS}>Todos</option>
            {opcoes.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export function FiltersPanel({
  aberto,
  filtros,
  opcoes,
  onFechar,
  onChange,
  onRedefinir,
}: FiltersPanelProps) {
  // Cascata: GERES filtra os Municípios
  const municipiosDisponiveis = useMemo(() => {
    if (!opcoes?.municipios) return [];
    let lista = opcoes.municipios;

    if (filtros.geres !== TODOS) {
      lista = lista.filter((m) => m.geres === filtros.geres);
    } else if (filtros.mrae !== TODOS) {
      lista = lista.filter((m) => m.mrae === filtros.mrae);
    }

    return lista.map((m) => ({ valor: m.nome, rotulo: m.nome }));
  }, [opcoes?.municipios, filtros.geres, filtros.mrae]);

  // Lista de GERES
  const geresDisponiveis = useMemo(() => {
    if (!opcoes?.geres) return [];
    let listaGeres = opcoes.geres;

    if (filtros.mrae !== TODOS && opcoes.municipios) {
      const geresDaMrae = new Set(
        opcoes.municipios.filter((m) => m.mrae === filtros.mrae).map((m) => m.geres),
      );
      listaGeres = listaGeres.filter((g) => geresDaMrae.has(g));
    }

    return listaGeres.map((g) => ({ valor: g, rotulo: formatarRD(g) }));
  }, [opcoes?.geres, opcoes?.municipios, filtros.mrae]);

  const mraesDisponiveis = useMemo(() => {
    return (opcoes?.mraes ?? []).map((m) => ({ valor: m, rotulo: m }));
  }, [opcoes?.mraes]);

  const sistemasDisponiveis = useMemo(() => {
    return (opcoes?.sistemas ?? ['SAA', 'SES']).map((s) => ({
      valor: s,
      rotulo: s === 'SAA' ? 'SAA — Abastecimento de Água' : 'SES — Esgotamento Sanitário',
    }));
  }, [opcoes?.sistemas]);

  const categoriasDisponiveis = useMemo(() => {
    return (opcoes?.categorias ?? []).map((c) => ({ valor: c, rotulo: c }));
  }, [opcoes?.categorias]);

  const situacoesDisponiveis = useMemo(() => {
    return [
      { valor: 'OPERANDO', rotulo: 'Operando' },
      { valor: 'INOPERANTE', rotulo: 'Inoperante' },
      { valor: 'NAO_INFORMADO', rotulo: 'Não Informado' },
    ];
  }, []);

  const concessionariasDisponiveis = useMemo(() => {
    return [
      { valor: 'VITA', rotulo: 'Vita (Sertão / MRAE-I)' },
      { valor: 'AQUA', rotulo: 'Aqua (RMR - Pajeú / MRAE-II)' },
    ];
  }, []);

  const visibilidadesDisponiveis = useMemo(() => {
    return [
      { valor: 'visivel', rotulo: 'Visível (Superficial)' },
      { valor: 'invisivel', rotulo: 'Invisível (Subterrâneo)' },
    ];
  }, []);

  const setParcial = (parcial: Partial<FiltrosEstado>) => {
    onChange({ ...filtros, ...parcial });
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-[900] bg-slate-900/30 backdrop-blur-xs transition-opacity duration-300 ${
          aberto ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onFechar}
        aria-hidden="true"
      />

      {/* Gaveta lateral deslizante */}
      <aside
        className={`fixed inset-y-0 left-0 z-[1000] flex w-full max-w-sm flex-col bg-card shadow-2xl transition-transform duration-300 ease-out sm:w-80 ${
          aberto ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-label="Painel de Filtros"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
          <h2 className="text-sm font-semibold text-foreground">Filtros de Pesquisa</h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar painel de filtros"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border/50">
          <Sanfona
            titulo="Microrregião (MRAE)"
            valor={filtros.mrae}
            opcoes={mraesDisponiveis}
            onChange={(v) => {
              setParcial({
                mrae: v,
                geres: TODOS,
                municipio: TODOS,
              });
            }}
          />

          <Sanfona
            titulo="Região de Desenvolvimento (RD)"
            valor={filtros.geres}
            opcoes={geresDisponiveis}
            onChange={(v) => {
              setParcial({
                geres: v,
                municipio: TODOS,
              });
            }}
          />

          <Sanfona
            titulo="Município"
            valor={filtros.municipio}
            opcoes={municipiosDisponiveis}
            onChange={(v) => setParcial({ municipio: v })}
          />

          <Sanfona
            titulo="Sistema"
            valor={filtros.sistema}
            opcoes={sistemasDisponiveis}
            onChange={(v) => setParcial({ sistema: v })}
          />

          <Sanfona
            titulo="Categoria"
            valor={filtros.categoria}
            opcoes={categoriasDisponiveis}
            onChange={(v) => setParcial({ categoria: v })}
          />

          <Sanfona
            titulo="Situação"
            valor={filtros.situacao}
            opcoes={situacoesDisponiveis}
            onChange={(v) => setParcial({ situacao: v })}
          />

          <Sanfona
            titulo="Concessionária"
            valor={filtros.concessionaria}
            opcoes={concessionariasDisponiveis}
            onChange={(v) => setParcial({ concessionaria: v })}
          />

          <Sanfona
            titulo="Visibilidade"
            valor={filtros.visibilidade}
            opcoes={visibilidadesDisponiveis}
            onChange={(v) => setParcial({ visibilidade: v })}
          />
        </div>

        <div className="border-t border-border px-4 py-3.5 bg-muted/20 flex gap-2">
          <button
            type="button"
            onClick={onRedefinir}
            className="w-full rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Redefinir filtros
          </button>
        </div>
      </aside>
    </>
  );
}
