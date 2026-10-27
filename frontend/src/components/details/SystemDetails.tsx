'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, FileText, Loader2, X } from 'lucide-react';
import type { BemDetalhe } from '@/types/bem';

interface SystemDetailsProps {
  bemId: number;
  onFechar: () => void;
}

type Aba = 'visao' | 'equip' | 'docs';

const abas: { id: Aba; label: string }[] = [
  { id: 'visao', label: 'Visão Geral' },
  { id: 'equip', label: 'Equipamentos' },
  { id: 'docs', label: 'Documentos' },
];

function Linha({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-xs text-muted-foreground shrink-0">{rotulo}</dt>
      <dd className="text-right text-sm font-medium text-foreground break-words">{valor || 'Não informado'}</dd>
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
      {texto}
    </p>
  );
}

export function SystemDetails({ bemId, onFechar }: SystemDetailsProps) {
  const [aba, setAba] = useState<Aba>('visao');
  const [bem, setBem] = useState<BemDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function buscarDetalhes() {
      try {
        setCarregando(true);
        setErro(null);
        const res = await fetch(`/api/bens/${bemId}`);
        if (!res.ok) {
          throw new Error(`Falha ao obter detalhes do bem (${res.status})`);
        }
        const data: BemDetalhe = await res.json();
        if (ativo) {
          setBem(data);
        }
      } catch (err: unknown) {
        if (ativo) {
          const msg = err instanceof Error ? err.message : 'Erro de conexão';
          setErro(msg);
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void buscarDetalhes();

    return () => {
      ativo = false;
    };
  }, [bemId]);

  return (
    <div className="pointer-events-auto absolute inset-x-3 bottom-3 z-[1000] max-h-[70%] overflow-hidden rounded-xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-4 sm:max-h-[calc(100%-2rem)] sm:w-[22rem]">
      {/* Cabeçalho do Painel */}
      <div className="flex items-start gap-3 bg-brand-deep px-4 py-3 text-white">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-white">
            {bem ? bem.nome : 'Carregando...'}
          </h2>
          <p className="mt-0.5 text-xs text-white/70">
            {bem ? `Código: ${bem.codigo_unico}` : `ID: #${bemId}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar detalhes"
          className="rounded-md p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Navegação por Abas */}
      <div className="flex border-b border-border bg-muted/20">
        {abas.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setAba(item.id)}
            className={`flex-1 border-b-2 px-2 py-2.5 text-xs font-medium transition-colors ${
              aba === item.id
                ? 'border-brand text-brand font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
            {item.id === 'equip' && bem && bem.filhos.length > 0 && (
              <span className="ml-1 text-[10px] text-muted-foreground">({bem.filhos.length})</span>
            )}
            {item.id === 'docs' && bem && bem.documentos.length > 0 && (
              <span className="ml-1 text-[10px] text-muted-foreground">({bem.documentos.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo da Aba */}
      <div className="max-h-[calc(70vh-7rem)] overflow-y-auto px-4 py-4 sm:max-h-[calc(100vh-12rem)]">
        {carregando && (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="size-6 animate-spin text-brand" />
            <span className="text-xs text-muted-foreground font-medium">Buscando dados cadastrais...</span>
          </div>
        )}

        {erro && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {erro}
          </div>
        )}

        {!carregando && !erro && bem && (
          <>
            {/* Aba: Visão Geral (7 campos essenciais) */}
            {aba === 'visao' && (
              <dl className="divide-y divide-border/60">
                <Linha rotulo="Código Único" valor={bem.codigo_unico} />
                <Linha rotulo="Nome" valor={bem.nome} />
                <Linha rotulo="Endereço" valor={bem.endereco} />
                <Linha rotulo="Município" valor={bem.municipio?.nome} />
                <Linha rotulo="Categoria" valor={bem.categoria} />
                <Linha
                  rotulo="Tipo de Sistema"
                  valor={
                    bem.tipo_sistema === 'SAA'
                      ? 'SAA — Abastecimento de água'
                      : 'SES — Esgotamento sanitário'
                  }
                />
                <Linha
                  rotulo="Situação"
                  valor={bem.situacao === 'OPERANDO' ? 'Operando' : 'Inoperante'}
                />
              </dl>
            )}

            {/* Aba: Equipamentos (Bens Filhos) */}
            {aba === 'equip' &&
              (bem.filhos.length === 0 ? (
                <Vazio texto="Não há equipamentos cadastrados para este bem" />
              ) : (
                <ul className="space-y-2">
                  {bem.filhos.map((filho) => (
                    <li
                      key={filho.id}
                      className="rounded-md border border-border bg-card p-2.5 transition-colors hover:border-brand/40"
                    >
                      <p className="text-xs font-semibold text-foreground">{filho.nome}</p>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-mono">{filho.codigo_unico}</span>
                        <span
                          className={`font-medium ${
                            filho.situacao === 'OPERANDO' ? 'text-brand' : 'text-slate-400'
                          }`}
                        >
                          {filho.situacao === 'OPERANDO' ? 'Operando' : 'Inoperante'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ))}

            {/* Aba: Documentos (Google Drive) */}
            {aba === 'docs' &&
              (bem.documentos.length === 0 ? (
                <Vazio texto="Não há documentos anexados a este bem" />
              ) : (
                <ul className="space-y-2">
                  {bem.documentos.map((doc) => (
                    <li key={doc.id}>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 rounded-md border border-border p-2.5 text-foreground transition-colors hover:bg-muted hover:border-brand/40 group"
                      >
                        <FileText className="size-4 shrink-0 text-brand" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-foreground group-hover:text-brand">
                            {doc.nome}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {doc.tipo || 'Documento'}
                          </p>
                        </div>
                        <ExternalLink className="size-3.5 shrink-0 text-muted-foreground group-hover:text-brand" />
                      </a>
                    </li>
                  ))}
                </ul>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
