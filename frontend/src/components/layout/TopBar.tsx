'use client';

import { Eraser, LogOut, Search, SlidersHorizontal } from 'lucide-react';

interface TopBarProps {
  busca: string;
  onBuscaChange: (valor: string) => void;
  onAbrirFiltros?: () => void;
  onLimpar: () => void;
  onSair?: () => void;
  filtrosAtivos?: number;
}

export function TopBar({
  busca,
  onBuscaChange,
  onAbrirFiltros,
  onLimpar,
  onSair,
  filtrosAtivos = 0,
}: TopBarProps) {
  return (
    <header className="z-[500] border-b border-border bg-card/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 sm:gap-4 sm:px-5 sm:py-2.5">
        <h1 className="font-display text-lg font-semibold tracking-tight text-brand-deep">
          busc<span className="text-brand">ARPE</span>
          <span className="ml-2 hidden text-sm font-medium text-muted-foreground lg:inline">
            — Sistemas de Saneamento de Pernambuco
          </span>
        </h1>

        <div className="order-3 flex w-full items-center gap-2 sm:order-2 sm:mx-auto sm:w-auto sm:max-w-xl sm:flex-1">
          {onAbrirFiltros && (
            <button
              type="button"
              onClick={onAbrirFiltros}
              className="relative inline-flex shrink-0 items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <SlidersHorizontal className="size-4 text-brand" />
              Filtros
              {filtrosAtivos > 0 && (
                <span className="ml-0.5 rounded-full bg-brand px-1.5 text-[10px] font-semibold text-white">
                  {filtrosAtivos}
                </span>
              )}
            </button>
          )}

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => onBuscaChange(e.target.value)}
              placeholder="Buscar por nome, código, município, categoria…"
              aria-label="Buscar bens"
              className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/25"
            />
          </div>
        </div>

        <div className="order-2 ml-auto flex items-center gap-1 sm:order-3 sm:ml-0">
          <button
            type="button"
            onClick={onLimpar}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Eraser className="size-4" />
            Limpar
          </button>
          {onSair && (
            <button
              type="button"
              onClick={onSair}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
              title="Encerrar sessão"
            >
              <LogOut className="size-4" />
              Sair
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
