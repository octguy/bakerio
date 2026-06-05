"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [10.7769, 106.7009];

function CenterTracker({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  const map = useMapEvents({
    move: () => {
      const center = map.getCenter();
      onChange(center.lat, center.lng);
    },
    moveend: () => {
      const center = map.getCenter();
      onChange(center.lat, center.lng);
    },
  });

  useEffect(() => {
    const center = map.getCenter();
    onChange(center.lat, center.lng);
  }, [map, onChange]);

  return null;
}

export function AddressMapPicker({
  lat,
  lng,
  onChange,
}: {
  lat?: number;
  lng?: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const [initialCenter] = useState<[number, number]>([
    Number.isFinite(lat) ? lat! : DEFAULT_CENTER[0],
    Number.isFinite(lng) ? lng! : DEFAULT_CENTER[1],
  ]);

  return (
    <div className="relative h-64 overflow-hidden rounded-2xl border border-crust bg-butter">
      <MapContainer
        center={initialCenter}
        zoom={15}
        className="h-full w-full"
        zoomControl={true}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <CenterTracker onChange={onChange} />
      </MapContainer>
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full">
        <div className="flex h-9 w-9 rotate-45 items-center justify-center rounded-full rounded-br-none border-2 border-white bg-cinnamon shadow-[0_4px_12px_rgba(44,24,16,0.28)]">
          <span className="-rotate-45 font-mono text-[11px] font-bold text-white">Me</span>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] rounded-xl bg-white/90 px-3 py-2 text-center font-editorial text-[12px] italic text-caramel shadow-sm backdrop-blur">
        Move the map until the pin sits on your delivery spot.
      </div>
    </div>
  );
}
