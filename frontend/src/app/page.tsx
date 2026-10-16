'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [health, setHealth] = useState<{ status?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        setHealth({ error: err.message });
        setLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-zinc-50 text-zinc-900">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md border border-zinc-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-saa"></div>
          <h1 className="text-xl font-bold text-zinc-800">buscARPE — Integração Fullstack</h1>
        </div>
        <p className="text-sm text-zinc-600">
          Prova de conceito da Sprint 0: Next.js consumindo NestJS através de rewrites transparentes (<code className="bg-zinc-100 px-1 py-0.5 rounded text-xs font-mono">/api/health</code>).
        </p>

        <div className="p-4 rounded-lg border bg-zinc-50 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Status do Backend (NestJS na porta 3001)</div>
          {loading && <p className="text-sm text-zinc-500 animate-pulse">Testando conexão com o NestJS...</p>}
          {!loading && health?.status === 'ok' && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Conexão bem-sucedida: <code className="bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-mono text-xs">{JSON.stringify(health)}</code>
            </div>
          )}
          {!loading && health?.error && (
            <div className="text-sm text-rose-600 font-medium">
              Falha na conexão: {health.error}
              <p className="text-xs text-zinc-500 mt-1">Verifique se o backend NestJS está rodando em outro terminal via <code className="font-mono">npm run start:dev</code>.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
