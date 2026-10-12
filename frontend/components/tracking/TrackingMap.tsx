'use client';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { TrackingPerson } from '@/types/tracking';
import { trackingPosition } from '@/types/tracking';
import { UiIcon } from '../UiIcon';

export default function TrackingMap({
  people,
  selectedId,
  onSelect,
}: {
  people: TrackingPerson[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const tilesRef = useRef<L.TileLayer | null>(null);
  const previousId = useRef<string | null>(null);
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const map = L.map(container.current, {
      scrollWheelZoom: false,
      zoomControl: false,
      zoomAnimation: !reduce,
      fadeAnimation: !reduce,
      markerZoomAnimation: !reduce,
    }).setView([-6.21, 106.801], 12);
    mapRef.current = map;
    L.control
      .zoom({
        position: 'bottomright',
        zoomInTitle: 'Perbesar peta',
        zoomOutTitle: 'Perkecil peta',
      })
      .addTo(map);
    const tiles = L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
      },
    ).addTo(map);
    tilesRef.current = tiles;
    tiles.on('tileerror', () => setTileError(true));
    layersRef.current = L.layerGroup().addTo(map);
    const resize = new ResizeObserver(() =>
      map.invalidateSize({ animate: false }),
    );
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
      tilesRef.current = null;
      previousId.current = null;
    };
  }, []);
  useEffect(() => {
    const map = mapRef.current,
      layers = layersRef.current;
    if (!map || !layers) return;
    layers.clearLayers();
    for (const person of people) {
      const selected = person.id === selectedId;
      const avatar = document.createElement('span');
      avatar.textContent = person.name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('');
      const marker = L.marker(trackingPosition(person), {
        icon: L.divIcon({
          html: avatar,
          className:
            'tracking-map-marker' +
            (selected ? ' is-selected' : '') +
            (person.stale ? ' is-stale' : ''),
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
        title: 'Pilih ' + person.name,
        alt: 'Posisi simulasi ' + person.name,
        zIndexOffset: selected ? 1000 : 0,
      }).addTo(layers);
      const tooltip = document.createElement('span');
      tooltip.textContent = person.name;
      marker
        .bindTooltip(tooltip, { direction: 'top', offset: [0, -20] })
        .on('click', () => onSelect(person.id));
    }
    const selected = people.find((person) => person.id === selectedId);
    if (selected) {
      const css = getComputedStyle(document.documentElement);
      L.polyline([selected.start, selected.destination], {
        color: css.getPropertyValue('--color-023').trim(),
        weight: 2,
        dashArray: '5 7',
        opacity: 0.65,
      }).addTo(layers);
      L.circleMarker(selected.destination, {
        radius: 7,
        color: css.getPropertyValue('--color-007').trim(),
        weight: 2,
        fillColor: css.getPropertyValue('--color-095').trim(),
        fillOpacity: 1,
      })
        .addTo(layers)
        .bindTooltip('Lokasi pelanggan (simulasi)');
      if (previousId.current !== selectedId) {
        const bounds = L.latLngBounds([
          selected.start,
          selected.destination,
        ]).pad(0.7);
        map.stop();
        const options = { maxZoom: 14, padding: L.point(45, 45) };
        if (previousId.current === null)
          map.fitBounds(bounds, { ...options, animate: false });
        else
          map.flyToBounds(bounds, {
            ...options,
            duration: 0.45,
            animate: !window.matchMedia('(prefers-reduced-motion: reduce)')
              .matches,
          });
        previousId.current = selectedId;
      }
    }
  }, [people, selectedId, onSelect]);
  return (
    <div className="tracking-map-wrap">
      <div
        ref={container}
        className="tracking-map"
        role="region"
        aria-label="Peta posisi simulasi petugas"
      />
      <div className="tracking-map-caption">
        <span>Jakarta · posisi simulasi</span>
        <span>Garis menunjukkan arah tujuan</span>
      </div>
      <button
        className="button tracking-map-focus"
        type="button"
        onClick={() => {
          const selected = people.find((person) => person.id === selectedId);
          if (selected) {
            mapRef.current?.stop();
            mapRef.current?.flyTo(trackingPosition(selected), 14, {
              duration: 0.45,
              animate: !window.matchMedia('(prefers-reduced-motion: reduce)')
                .matches,
            });
          }
        }}
      >
        <UiIcon name="pin" />
        Fokus petugas
      </button>
      {tileError && (
        <div className="tracking-map-error" role="status">
          Peta belum dapat dimuat.
          <button
            type="button"
            onClick={() => {
              setTileError(false);
              tilesRef.current?.redraw();
            }}
          >
            Coba lagi
          </button>
        </div>
      )}
    </div>
  );
}
