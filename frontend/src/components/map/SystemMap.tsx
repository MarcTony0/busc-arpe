'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';

import { PERNAMBUCO_CENTER, PERNAMBUCO_ZOOM, type BemLeve } from '@/types/bem';

interface SystemMapProps {
  bens: BemLeve[];
  selecionadoId: number | null;
  onSelecionar?: (bem: BemLeve) => void;
}

function criarIcone(bem: BemLeve, ativo: boolean) {
  const situacao = bem.situacao === 'INOPERANTE' ? 'Inoperante' : 'Operando';
  return L.divIcon({
    className: '',
    html: `<div class="marker-pin" data-tipo="${bem.tipo_sistema}" data-situacao="${situacao}" data-active="${ativo}"><span>${bem.tipo_sistema}</span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });
}

type MarkerBem = L.Marker & { tipoBem?: string };

export default function SystemMap({ bens, selecionadoId, onSelecionar }: SystemMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: PERNAMBUCO_CENTER,
      zoom: PERNAMBUCO_ZOOM,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    const RecentrarControl = L.Control.extend({
      onAdd: () => {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const link = L.DomUtil.create('a', '', div) as HTMLAnchorElement;
        link.href = '#';
        link.title = 'Recentralizar em Pernambuco';
        link.setAttribute('aria-label', 'Recentralizar mapa em Pernambuco');
        link.setAttribute('role', 'button');
        link.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="margin:9px auto" aria-hidden="true"><circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg>';
        L.DomEvent.on(link, 'click', (e) => {
          L.DomEvent.preventDefault(e);
          map.setView(PERNAMBUCO_CENTER, PERNAMBUCO_ZOOM);
        });
        return div;
      },
    });

    new RecentrarControl({ position: 'bottomleft' }).addTo(map);

    markersRef.current = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      iconCreateFunction: (cluster) => {
        const tipos = new Set(cluster.getAllChildMarkers().map((m) => (m as MarkerBem).tipoBem));
        const mix = tipos.size > 1 ? 'MISTO' : [...tipos][0] || 'SAA';
        return L.divIcon({
          className: '',
          html: `<div class="bem-cluster" data-mix="${mix}">${cluster.getChildCount()}</div>`,
          iconSize: [36, 36],
        });
      },
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const grupo = markersRef.current;
    if (!grupo) return;
    grupo.clearLayers();

    const marcadoresValidos: L.Marker[] = [];

    for (const bem of bens) {
      if (typeof bem.latitude === 'number' && typeof bem.longitude === 'number') {
        const m: MarkerBem = L.marker([bem.latitude, bem.longitude], {
          icon: criarIcone(bem, bem.id === selecionadoId),
          title: `${bem.nome} (${bem.codigo_unico})`,
        });

        if (onSelecionar) {
          m.on('click', () => onSelecionar(bem));
        }

        m.tipoBem = bem.tipo_sistema;
        marcadoresValidos.push(m);
      }
    }

    grupo.addLayers(marcadoresValidos);
  }, [bens, selecionadoId, onSelecionar]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
}
