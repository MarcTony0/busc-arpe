'use client';

import { useEffect, useState, useCallback } from 'react';
import Map from '@/components/map';
import { TopBar } from '@/components/layout/TopBar';
import type { BemLeve } from '@/types/bem';

export default function Home() {
  const [bens, setBens] = useState<BemLeve[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<BemLeve | null>(null);

  const carregarBens = useCallback(async (termoBusca?: string) => {
    try {
      setCarregando(true);
      setErro(null);
      const params = new URLSearchParams();
      if (termoBusca && termoBusca.trim().length > 0) {
        params.set('q', termoBusca.trim());
      }

      const queryString = params.toString();
      const url = `/api/bens${queryString ? `?${queryString}` : ''}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Erro ao carregar bens (${res.status})`);
      }

      const data: BemLeve[] = await res.json();
      setBens(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na conexão com a API';
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    void carregarBens();
  }, [carregarBens]);

  // Debounce na busca textual
  useEffect(() => {
    const handler = setTimeout(() => {
      void carregarBens(busca);
    }, 350);

    return () => clearTimeout(handler);
  }, [busca, carregarBens]);

  const limpar = () => {
    setBusca('');
    setSelecionado(null);
    void carregarBens('');
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <TopBar
        busca={busca}
        onBuscaChange={setBusca}
        onLimpar={limpar}
      />

      <main className="relative flex-1 overflow-hidden">
        <Map
          bens={bens}
          selecionadoId={selecionado?.id ?? null}
          onSelecionar={setSelecionado}
        />

        {/* Card informativo institucional */}
        <div className="absolute left-3 top-3 z-[600] hidden max-w-xs rounded-lg border border-border bg-card/95 p-3 shadow-md backdrop-blur sm:block">
          <h2 className="font-display text-sm font-semibold text-foreground">Sobre o buscARPE</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Plataforma de consulta geográfica de sistemas de saneamento de Pernambuco. Explore as
            instalações nos marcadores e clusters do mapa.
          </p>
        </div>

        {/* Contador de bens retornados */}
        <div className="pointer-events-none absolute right-3 top-3 z-[600] rounded-lg border border-border bg-card/95 px-4 py-2 text-right shadow-md backdrop-blur">
          <p className="font-display text-xl font-semibold leading-none text-brand">
            {carregando ? '...' : bens.length.toLocaleString('pt-BR')}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {bens.length === 1 ? 'bem cadastrado' : 'bens cadastrados'}
          </p>
        </div>

        {/* Feedback visual de estado vazio */}
        {!carregando && bens.length === 0 && (
          <div className="absolute left-1/2 top-1/2 z-[600] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card px-5 py-3 text-sm text-muted-foreground shadow-lg">
            Nenhum bem encontrado
          </div>
        )}

        {/* Feedback visual de erro */}
        {erro && (
          <div className="absolute bottom-6 left-1/2 z-[600] -translate-x-1/2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700 shadow-md">
            {erro}. Certifique-se de que o backend NestJS está em execução na porta 3001.
          </div>
        )}
      </main>
    </div>
  );
}
