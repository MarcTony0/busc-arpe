'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type SystemMapType from './SystemMap';

const SystemMapDynamic = dynamic(() => import('./SystemMap'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <span className="text-xs font-medium text-slate-500">Carregando mapa...</span>
      </div>
    </div>
  ),
});

export default function Map(props: ComponentProps<typeof SystemMapType>) {
  return <SystemMapDynamic {...props} />;
}
