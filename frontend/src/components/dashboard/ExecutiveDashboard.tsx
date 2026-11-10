'use client';

import { useMemo } from 'react';
import { Activity, Building2, MapPin, Wrench, BarChart3, X } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BemLeve } from '@/types/bem';

interface ExecutiveDashboardProps {
  aberto: boolean;
  onFechar: () => void;
  bens: BemLeve[];
  filtrado: boolean;
}

const RD_NOMES: Record<string, string> = {
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

const TODAS_RDS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII',
];

export function ExecutiveDashboard({
  aberto,
  onFechar,
  bens,
  filtrado,
}: ExecutiveDashboardProps) {
  const resumo = useMemo(() => {
    const instalacoes = bens.length;
    const filhos = bens.reduce(
      (total, b) => total + (b._count?.bensFilhos ?? 0),
      0
    );
    const municipiosSet = new Set(
      bens.map((b) => b.municipio?.nome).filter(Boolean)
    );
    const municipios = municipiosSet.size;

    const operando = bens.filter((b) => b.situacao === 'OPERANDO').length;
    const taxaOperacional =
      instalacoes > 0 ? (operando / instalacoes) * 100 : 0;

    // Concessionárias
    const vitaTotal = bens.filter(
      (b) => (b.concessionaria ?? '').toUpperCase() === 'VITA'
    ).length;
    const aquaTotal = bens.filter(
      (b) => (b.concessionaria ?? '').toUpperCase() === 'AQUA'
    ).length;
    const concessionarias = [
      { nome: 'VITA', total: vitaTotal, cor: '#1D6FB8' },
      { nome: 'AQUA', total: aquaTotal, cor: '#0d9488' },
    ];

    // Sistemas: SAA vs SES
    const saaTotal = bens.filter((b) => b.tipo_sistema === 'SAA').length;
    const sesTotal = bens.filter((b) => b.tipo_sistema === 'SES').length;
    const sistemas = [
      { nome: 'SAA (Água)', total: saaTotal, cor: '#1D6FB8' },
      { nome: 'SES (Esgoto)', total: sesTotal, cor: '#795548' },
    ];

    // Ranking por 12 Regiões de Desenvolvimento
    const regioes = TODAS_RDS.map((geresId) => {
      const bensDaRd = bens.filter((b) => b.municipio?.geres === geresId);
      const instCount = bensDaRd.length;
      const filhosCount = bensDaRd.reduce(
        (acc, b) => acc + (b._count?.bensFilhos ?? 0),
        0
      );
      return {
        id: geresId,
        nome: RD_NOMES[geresId] ?? `${geresId} RD`,
        instalacoes: instCount,
        filhos: filhosCount,
        total: instCount + filhosCount,
      };
    }).sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));

    return {
      instalacoes,
      filhos,
      municipios,
      taxaOperacional,
      concessionarias,
      sistemas,
      regioes,
    };
  }, [bens]);

  if (!aberto) return null;

  const tooltipStyle = {
    background: '#ffffff',
    color: '#0f172a',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };

  const indicadores = [
    {
      nome: 'Total de Instalações',
      valor: resumo.instalacoes.toLocaleString('pt-BR'),
      icon: Building2,
      cor: 'text-[#1D6FB8]',
      bg: 'bg-blue-50 border-blue-200',
    },
    {
      nome: 'Total de Bens Filhos',
      valor: resumo.filhos.toLocaleString('pt-BR'),
      icon: Wrench,
      cor: 'text-[#795548]',
      bg: 'bg-amber-50 border-amber-200',
    },
    {
      nome: 'Municípios Atendidos',
      valor: resumo.municipios.toLocaleString('pt-BR'),
      icon: MapPin,
      cor: 'text-[#1D6FB8]',
      bg: 'bg-indigo-50 border-indigo-200',
    },
    {
      nome: 'Taxa de Operacionalidade',
      valor: `${resumo.taxaOperacional.toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}%`,
      icon: Activity,
      cor: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onFechar}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4 sm:px-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand">
              <BarChart3 className="size-4" />
              busc<span className="font-bold">ARPE</span> · ARPE Pernambuco
            </div>
            <h2
              id="dashboard-title"
              className="mt-1 font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground"
            >
              Painel Executivo de Indicadores
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sistemas de Saneamento ·{' '}
              {filtrado ? (
                <span className="font-medium text-brand">
                  Recorte dos filtros ativos em tela
                </span>
              ) : (
                <span className="font-medium text-emerald-600">
                  Visão consolidada estadual
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Fechar Painel"
          >
            <X className="size-5" />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8 space-y-8">
          {/* 4 Cards de Indicadores */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {indicadores.map(({ nome, valor, icon: Icon, cor, bg }) => (
              <article
                key={nome}
                className={`rounded-xl border p-4 sm:p-5 transition-shadow hover:shadow-md ${bg}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {nome}
                  </span>
                  <Icon className={`size-5 ${cor}`} />
                </div>
                <p className={`mt-3 font-display text-2xl sm:text-3xl font-bold ${cor}`}>
                  {valor}
                </p>
                {nome === 'Taxa de Operacionalidade' && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Instalações com condição operando
                  </p>
                )}
              </article>
            ))}
          </div>

          {/* Gráficos: Concessionárias & Sistemas */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Gráfico 1: Concessionárias */}
            <section className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-display text-base font-semibold text-foreground">
                Ativos por Concessionária
              </h3>
              <p className="text-xs text-muted-foreground">
                Distribuição de instalações entre operadores regulados
              </p>
              <div className="relative mt-4 h-56">
                {bens.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Nenhum bem no recorte selecionado
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={resumo.concessionarias}
                          dataKey="total"
                          nameKey="nome"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={4}
                          stroke="var(--background)"
                        >
                          {resumo.concessionarias.map((c) => (
                            <Cell key={c.nome} fill={c.cor} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-display text-2xl font-bold text-foreground">
                        {resumo.instalacoes}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        instalações
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-3 flex justify-center gap-6 text-xs">
                {resumo.concessionarias.map((c) => (
                  <div key={c.nome} className="flex items-center gap-2">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: c.cor }}
                    />
                    <span className="font-medium text-foreground">{c.nome}:</span>
                    <strong className="text-muted-foreground">{c.total}</strong>
                  </div>
                ))}
              </div>
            </section>

            {/* Gráfico 2: Sistemas Água vs Esgoto */}
            <section className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-display text-base font-semibold text-foreground">
                Distribuição por Sistema
              </h3>
              <p className="text-xs text-muted-foreground">
                Volume de instalações de Água (SAA) vs Esgoto (SES)
              </p>
              <div className="mt-4 h-56">
                {bens.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Nenhum bem no recorte selecionado
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={resumo.sistemas}
                      margin={{ top: 20, right: 20, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="nome"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#475569', fontSize: 12 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                      />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={tooltipStyle}
                      />
                      <Bar
                        dataKey="total"
                        name="Instalações"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={80}
                      >
                        {resumo.sistemas.map((s) => (
                          <Cell key={s.nome} fill={s.cor} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-3 flex justify-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-[#1D6FB8]" />
                  <span className="text-muted-foreground">SAA · Água</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-[#795548]" />
                  <span className="text-muted-foreground">SES · Esgoto</span>
                </div>
              </div>
            </section>
          </div>

          {/* Tabela: Ranking das 12 Regiões de Desenvolvimento */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">
                  Ranking por Região de Desenvolvimento
                </h3>
                <p className="text-xs text-muted-foreground">
                  Total consolidado nas 12 RDs de Pernambuco (Instalações + Bens Filhos)
                </p>
              </div>
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                12 RDs Oficiais
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-y border-border bg-muted/40 font-semibold text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">Região de Desenvolvimento</th>
                    <th className="py-2.5 px-3 text-right">Instalações</th>
                    <th className="py-2.5 px-3 text-right">Bens Filhos</th>
                    <th className="py-2.5 px-3 text-right font-bold text-foreground">
                      Total de Bens
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {resumo.regioes.map((rd, index) => (
                    <tr
                      key={rd.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center tabular-nums text-muted-foreground">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        {rd.nome}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                        {rd.instalacoes.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                        {rd.filhos.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-foreground">
                        {rd.total.toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

