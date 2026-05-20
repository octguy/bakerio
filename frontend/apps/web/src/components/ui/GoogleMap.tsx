'use client';

import { useState } from 'react';

interface GoogleMapProps {
  lat: number;
  lng: number;
  name?: string;
  className?: string;
  zoom?: number;
}

export default function GoogleMap({ lat, lng, name, className = '', zoom = 15 }: GoogleMapProps) {
  const [loaded, setLoaded] = useState(false);
  const query = name ? encodeURIComponent(name) : `${lat},${lng}`;
  const src = `https://maps.google.com/maps?width=600&height=400&hl=vi&q=${query}&z=${zoom}&ie=UTF8&iwloc=B&output=embed`;

  return (
    <div className={`relative overflow-hidden rounded-[10px] bg-crust ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-caramel animate-pulse">Loading map...</p>
        </div>
      )}
      <iframe
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0, minHeight: '100%' }}
        allowFullScreen
        loading="lazy"
        scrolling="no"
        title={name ? `Map - ${name}` : 'Google Map'}
        onLoad={() => setLoaded(true)}
        className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
