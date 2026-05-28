'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { WebLocation } from '@/lib/locations';

interface LocationMapProps {
  locations: WebLocation[];
  selectedLocation: WebLocation | null;
  onSelectLocation: (name: string) => void;
}

// A helper component to handle map movement when selected location changes
function MapController({ selectedLocation }: { selectedLocation: WebLocation | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedLocation) {
      map.setView([selectedLocation.lat, selectedLocation.lng], 15, {
        animate: true,
        duration: 1.0,
      });
    }
  }, [selectedLocation, map]);

  return null;
}

export default function LocationMap({ locations, selectedLocation, onSelectLocation }: LocationMapProps) {
  // Center map around HCMC by default
  const defaultCenter: [number, number] = [10.7769, 106.7009];
  const defaultZoom = 12;

  // Custom marker icon using L.divIcon
  const createCustomIcon = (isSel: boolean, index: number) => {
    const num = String(index + 1).padStart(2, "0");
    return L.divIcon({
      className: 'custom-map-marker',
      html: `
        <span
          class="flex items-center justify-center border-2 border-white shadow-[0_4px_12px_rgba(44,24,16,0.3)]"
          style="
            background: ${isSel ? "#D4943A" : "#2C1810"};
            color: #fff;
            width: ${isSel ? '36px' : '28px'};
            height: ${isSel ? '36px' : '28px'};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
          "
        >
          <span
            style="
              transform: rotate(45deg);
              font-family: monospace;
              font-weight: bold;
              font-size: ${isSel ? '12px' : '10px'};
            "
          >
            ${num}
          </span>
        </span>
      `,
      iconSize: isSel ? [36, 36] : [28, 28],
      iconAnchor: isSel ? [18, 36] : [14, 28],
      popupAnchor: isSel ? [0, -32] : [0, -24],
    });
  };

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer
        center={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {locations.map((loc, index) => {
          const isSel = selectedLocation?.name === loc.name;
          return (
            <Marker
              key={loc.name}
              position={[loc.lat, loc.lng]}
              icon={createCustomIcon(isSel, index)}
              eventHandlers={{
                click: () => onSelectLocation(loc.name),
              }}
            >
              <Popup>
                <div className="font-sans text-[#2C1810] p-1">
                  <h4 className="font-bold text-sm m-0 leading-snug">{loc.name}</h4>
                  <p className="text-xs text-[#4A3228] my-1 leading-normal">{loc.address}</p>
                  <p className="text-[10px] text-[#7A5C3E] m-0 font-mono font-medium">{loc.hours}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <MapController selectedLocation={selectedLocation} />
      </MapContainer>
    </div>
  );
}
