import Image from "next/image";

interface Location {
  name: string;
  address: string;
  hours: string;
}

interface FeaturedLocationsProps {
  featuredLocations: Location[];
}

export function FeaturedLocations({ featuredLocations }: FeaturedLocationsProps) {
  // aria-label: card
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {featuredLocations.map((l, i) => {
        const heroes = [
          "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=85&auto=format",
          "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=1200&q=85&auto=format",
          "https://images.unsplash.com/photo-1559054663-e8d23213f55c?w=1200&q=85&auto=format",
        ];
        return (
          <article
            key={l.name}
            className="bkr-lift overflow-hidden rounded-sm border border-crust bg-white"
            aria-label={l.name}
          >
            <div className="relative h-[200px]">
              <Image src={heroes[i % heroes.length]} alt={l.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
              <div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-md border border-crust bg-cream font-mono text-[11px] font-bold text-espresso">
                {String(i + 1).padStart(2, "0")}
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-display text-[22px] leading-[1.1] tracking-tight text-espresso">{l.name}</h3>
              <div className="mt-1 font-editorial text-[13px] text-cinnamon">{l.address}</div>
              <div className="mt-4 flex items-center gap-2.5 font-mono text-[10.5px] tracking-wide text-caramel">
                <span className="inline-flex items-center gap-1 font-semibold text-sage">
                  <span className="bkr-pulse inline-block h-1.5 w-1.5 rounded-full bg-sage" />
                  Open
                </span>
                <span>· {l.hours}</span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
