'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Map from '@/components/map';
import { TopBar } from '@/components/layout/TopBar';
import { FiltersPanel } from '@/components/filters/FiltersPanel';
import { SystemDetails } from '@/components/details/SystemDetails';
import {
  TODOS,
  FILTROS_INICIAIS,
  type BemLeve,
  type FiltrosEstado,
  type FiltrosResponse,
} from '@/types/bem';

export default function Home() {
  const [bens, setBens] = useState<BemLeve[]>([]);
  const [opcoesFiltros, setOpcoesFiltros] = useState<FiltrosResponse | null>(null);
  const [filtros, setFiltros] = useState<FiltrosEstado>(FILTROS_INICIAIS);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<BemLeve | null>(null);

  // Carrega as opções dinâmicas dos filtros a partir da API
  useEffect(() => {
    fetch('/api/filtros')
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao carregar opções de filtros');
        return res.json();
      })
      .then((dados: FiltrosResponse) => {
        setOpcoesFiltros(dados);
      })
      .catch((err) => {
        console.warn('Erro ao buscar /api/filtros:', err);
      });
  }, []);

  // Busca cumulativa dos bens
  const carregarBens = useCallback(
    async (termoBusca: string, filtrosAtuais: FiltrosEstado) => {
      try {
        setCarregando(true);
        setErro(null);

        const params = new URLSearchParams();

        if (termoBusca && termoBusca.trim().length > 0) {
          params.set('q', termoBusca.trim());
        }

        if (filtrosAtuais.mrae !== TODOS) {
          params.set('mrae', filtrosAtuais.mrae);
        }
        if (filtrosAtuais.geres !== TODOS) {
          params.set('geres', filtrosAtuais.geres);
        }
        if (filtrosAtuais.municipio !== TODOS) {
          params.set('municipio', filtrosAtuais.municipio);
        }
        if (filtrosAtuais.sistema !== TODOS) {
          params.set('sistema', filtrosAtuais.sistema);
        }
        if (filtrosAtuais.categoria !== TODOS) {
          params.set('categoria', filtrosAtuais.categoria);
        }
        if (filtrosAtuais.situacao !== TODOS) {
          params.set('situacao', filtrosAtuais.situacao);
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
    },
    [],
  );

  // Debounce na busca textual e sincronização imediata nos filtros
  useEffect(() => {
    const handler = setTimeout(() => {
      void carregarBens(busca, filtros);
    }, 300);

    return () => clearTimeout(handler);
  }, [busca, filtros, carregarBens]);

  const filtrosAtivos = useMemo(() => {
    return Object.values(filtros).filter((v) => v !== TODOS).length;
  }, [filtros]);

  const redefinirFiltros = () => {
    setFiltros(FILTROS_INICIAIS);
  };

  const limparTudo = () => {
    setBusca('');
    setFiltros(FILTROS_INICIAIS);
    setSelecionado(null);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <TopBar
        busca={busca}
        onBuscaChange={setBusca}
        onAbrirFiltros={() => setFiltrosAbertos(true)}
        onLimpar={limparTudo}
        filtrosAtivos={filtrosAtivos}
      />

      <main className="relative flex-1 overflow-hidden">
        <Map
          bens={bens}
          selecionadoId={selecionado?.id ?? null}
          onSelecionar={setSelecionado}
        />

        {/* Card institucional */}
        <div className="absolute left-3 top-3 z-[600] hidden max-w-xs rounded-lg border border-border bg-card/95 p-3 shadow-md backdrop-blur sm:block">
          <h2 className="font-display text-sm font-semibold text-foreground">Sobre o buscARPE</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Plataforma de consulta geográfica de sistemas de saneamento de Pernambuco. Filtre os bens
            por região, município, sistema e categoria e clique em um marcador para ver detalhes.
          </p>
        </div>

        {/* Contador dinâmico de bens */}
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

        {/* Feedback de erro de comunicação */}
        {erro && (
          <div className="absolute bottom-6 left-1/2 z-[600] -translate-x-1/2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700 shadow-md">
            {erro}. Certifique-se de que o backend NestJS está em execução na porta 3001.
          </div>
        )}

        {/* Gaveta retrátil de filtros */}
        <FiltersPanel
          aberto={filtrosAbertos}
          filtros={filtros}
          opcoes={opcoesFiltros}
          onFechar={() => setFiltrosAbertos(false)}
          onChange={setFiltros}
          onRedefinir={redefinirFiltros}
        />
        {/* Painel flutuante de detalhes do bem selecionado */}
        {selecionado && (
          <SystemDetails
            bemId={selecionado.id}
            onFechar={() => setSelecionado(null)}
          />
        )}
      </main>
    </div>
  );
}
