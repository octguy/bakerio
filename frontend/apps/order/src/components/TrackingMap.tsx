'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Branch } from '@repo/api-client';

interface TrackingMapProps {
  branch: Branch | undefined;
  isDelivery: boolean;
}

// A helper component to handle map bounds
function MapBounds({ branch, isDelivery }: { branch: Branch | undefined, isDelivery: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!branch) return;
    // Fallback to central HCMC if branch coords are missing
    const branchLatLng: [number, number] = [branch.lat ?? 10.7769, branch.lng ?? 106.7009];
    
    if (isDelivery) {
      // Dummy customer location offset to the south-east
      const customerLatLng: [number, number] = [branchLatLng[0] - 0.005, branchLatLng[1] + 0.005];
      const bounds = L.latLngBounds([branchLatLng, customerLatLng]);
      map.fitBounds(bounds, { padding: [30, 30], animate: true, duration: 1.0 });
    } else {
      map.setView(branchLatLng, 15, { animate: true, duration: 1.0 });
    }
  }, [branch, isDelivery, map]);

  return null;
}

export default function TrackingMap({ branch, isDelivery }: TrackingMapProps) {
  const branchLatLng: [number, number] = branch ? [branch.lat ?? 10.7769, branch.lng ?? 106.7009] : [10.7769, 106.7009];
  const customerLatLng: [number, number] = [branchLatLng[0] - 0.005, branchLatLng[1] + 0.005];

  const createCustomIcon = (isBranch: boolean) => {
    return L.divIcon({
      className: 'custom-map-marker',
      html: `
        <span
          class="flex items-center justify-center shadow-[0_4px_12px_rgba(44,24,16,0.3)]"
          style="
            background: ${isBranch ? "#2C1810" : "#D4943A"};
            color: #fff;
            width: 28px;
            height: 28px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
          "
        >
          <span
            style="
              transform: rotate(45deg);
              font-family: monospace;
              font-weight: bold;
              font-size: 10px;
            "
          >
            ${isBranch ? "B" : "Me"}
          </span>
        </span>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
  };

  return (
    <div className="h-full w-full relative z-0 rounded-2xl overflow-hidden">
      <MapContainer
        center={branchLatLng}
        zoom={13}
        className="h-full w-full"
        zoomControl={false}
        dragging={true}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {branch && (
          <Marker
            position={branchLatLng}
            icon={createCustomIcon(true)}
          />
        )}

        {isDelivery && branch && (
          <Marker
            position={customerLatLng}
            icon={createCustomIcon(false)}
          />
        )}

        <MapBounds branch={branch} isDelivery={isDelivery} />
      </MapContainer>
    </div>
  );
}
