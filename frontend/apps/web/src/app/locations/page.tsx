import type { Metadata } from "next";
import Image from "next/image";
import LocationsContent from "./LocationsContent";

export const metadata: Metadata = { title: "Locations", description: "Find a Bakerio bakery near you — 10+ locations across Ho Chi Minh City with daily fresh bakes." };

export default function LocationsPage() {
  return (
    <main>
      <section className="relative h-[40vh] min-h-[300px] flex items-center justify-center">
        <Image src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&q=80" alt="Warm lighting inside a contemporary Bakerio store window showing coffee cups and bread" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(44,24,16,0.3)] to-[rgba(44,24,16,0.6)]" />
        <div className="relative text-center text-white z-10">
          <p className="font-[family-name:var(--font-script)] text-2xl md:text-3xl mb-2">find us</p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl font-bold">Our Locations</h1>
        </div>
      </section>
      <LocationsContent />
    </main>
  );
}
