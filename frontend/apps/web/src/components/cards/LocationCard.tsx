interface LocationCardProps {
  name: string;
  address: string;
  hours?: string;
  lat?: number;
  lng?: number;
}

export default function LocationCard({
  name,
  address,
  hours,
  lat,
  lng,
}: LocationCardProps) {
  const directionsUrl =
    lat && lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <div className="rounded-[10px] border border-crust bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <h3 className="font-bold text-espresso">{name}</h3>
      <p className="mt-1 text-sm text-warm-gray">{address}</p>
      {hours && <p className="mt-1 text-sm text-warm-gray">{hours}</p>}
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-sm font-medium text-golden hover:text-golden-dark transition-colors"
      >
        Get Directions →
      </a>
    </div>
  );
}
