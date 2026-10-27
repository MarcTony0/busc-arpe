'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/25';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!email.trim() || !senha.trim()) {
      setErro('E-mail ou senha inválidos');
      return;
    }

    try {
      setCarregando(true);

      const resposta = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          senha,
        }),
      });

      if (!resposta.ok) {
        setErro('E-mail ou senha inválidos');
        return;
      }

      // Redireciona com sucesso para /mapa ao autenticar (HU-09 CA-01)
      router.push('/mapa');
    } catch (err) {
      console.error('Erro na requisição de login:', err);
      setErro('E-mail ou senha inválidos');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-xl border border-border bg-card p-6 shadow-lg"
      >
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-brand-deep">
            busc<span className="text-brand">ARPE</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plataforma de consulta geográfica de sistemas de saneamento de Pernambuco
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-foreground">E-mail</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (erro) setErro(null);
            }}
            placeholder="usuario@arpe.pe.gov.br"
            className={inputClass}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-foreground">Senha</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={senha}
            onChange={(e) => {
              setSenha(e.target.value);
              if (erro) setErro(null);
            }}
            placeholder="••••••••"
            className={inputClass}
          />
        </label>

        {erro && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={carregando}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-deep disabled:opacity-60"
        >
          {carregando && <Loader2 className="size-4 animate-spin" />}
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
