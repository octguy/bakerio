import type { Metadata } from "next";
import Image from "next/image";
import MenuContent from "./MenuContent";

export const metadata: Metadata = { title: "Menu", description: "Explore Bakerio's full menu — artisan breads, pastries, cakes, and seasonal specials." };

export default function MenuPage() {
  return (
    <main>
      <section className="relative h-[40vh] min-h-[300px] flex items-center justify-center">
        <Image src="https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=1920&q=80" alt="" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(44,24,16,0.3)] to-[rgba(44,24,16,0.6)]" />
        <div className="relative text-center text-white z-10">
          <p className="font-[family-name:var(--font-script)] text-2xl md:text-3xl mb-2">what we offer</p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl font-bold">Our Menu</h1>
        </div>
      </section>
      <MenuContent />
    </main>
  );
}
