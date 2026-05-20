import Image from "next/image";
import { Wheat, Clock, Heart } from "lucide-react";
import ScrollReveal from "@/components/ui/ScrollReveal";
import SectionHeader from "@/components/ui/SectionHeader";
import TeamMemberCard from "@/components/cards/TeamMemberCard";
import { team } from "@/data/team";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "About", description: "Learn about Bakerio's story — from a small kitchen to 10+ artisan bakeries across Ho Chi Minh City." };

const values = [
  { icon: Wheat, title: "Craft", description: "Every product is handcrafted using traditional techniques and the finest ingredients — no shortcuts, no compromises." },
  { icon: Clock, title: "Freshness", description: "Baked fresh daily. We never sell yesterday's bread. Quality you can taste in every single bite." },
  { icon: Heart, title: "Community", description: "We source locally, support neighborhood farmers, and build connections one warm loaf at a time." },
];

const stats = [
  { label: "Founded", value: "2024" },
  { label: "Branches", value: "10+" },
  { label: "Products", value: "50+" },
  { label: "Team Members", value: "100+" },
];

export default function AboutPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[300px] flex items-center justify-center">
        <Image src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&q=80" alt="" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(44,24,16,0.3)] to-[rgba(44,24,16,0.6)]" />
        <div className="relative text-center text-white z-10">
          <p className="font-[family-name:var(--font-script)] text-2xl md:text-3xl mb-2">our story</p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl lg:text-6xl font-bold">Baked with Heart Since 2024</h1>
        </div>
      </section>

      {/* Origin Story */}
      <ScrollReveal>
        <section className="py-20 md:py-28 px-4 max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-espresso mb-6">How It All Began</h2>
            <p className="text-cocoa leading-relaxed mb-4">
              In 2024, a small kitchen in Saigon sparked something special. What began as a passion for artisan baking — perfecting sourdough starters, sourcing local ingredients, and sharing warm bread with neighbors — grew into Bakerio.
            </p>
            <p className="text-cocoa leading-relaxed">
              We believe every bite should tell a story. From our house-made butter croissants to our signature vanilla sponge, each product is crafted with patience, precision, and love.
            </p>
          </div>
          <div className="relative h-80 rounded-[10px] overflow-hidden">
            <Image src="https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=800&q=80" alt="Baker at work" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
          </div>
        </section>
      </ScrollReveal>

      {/* Vision Statement */}
      <ScrollReveal>
        <section className="py-20 md:py-28 px-4 bg-butter">
          <div className="max-w-4xl mx-auto text-center">
            <p className="font-[family-name:var(--font-script)] text-2xl text-caramel mb-4">our vision</p>
            <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl font-bold text-espresso mb-6">
              &ldquo;Freshly Baked Happiness&rdquo;
            </h2>
            <p className="text-cocoa text-lg leading-relaxed max-w-2xl mx-auto">
              Our mission is to bring warmth, craft, and community to every neighborhood through the art of baking.
            </p>
          </div>
        </section>
      </ScrollReveal>

      {/* Values */}
      <ScrollReveal>
        <section className="py-20 md:py-28 px-4 max-w-6xl mx-auto">
          <SectionHeader script="what we believe" title="Our Values" />
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((v) => (
              <div key={v.title} className="text-center p-8 rounded-[10px] bg-white border border-crust transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]">
                <v.icon className="mx-auto mb-4 text-golden" size={40} />
                <h3 className="font-[family-name:var(--font-display)] text-xl font-bold mb-2 text-espresso">{v.title}</h3>
                <p className="text-cocoa text-sm leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* Team */}
      <ScrollReveal>
        <section className="py-20 md:py-28 px-4 max-w-6xl mx-auto">
          <SectionHeader script="the people" title="Our Team" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {team.map((m) => (
              <TeamMemberCard key={m.name} {...m} />
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* Company Info / Stats */}
      <ScrollReveal>
        <section className="py-16 px-4 bg-white border-t border-crust">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-golden">{s.value}</p>
                <p className="text-cocoa text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* CTA */}
      <ScrollReveal>
        <section className="py-20 md:py-28 px-4 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-espresso mb-4">Join Our Team</h2>
          <p className="text-cocoa mb-8 max-w-lg mx-auto">We&apos;re always looking for passionate people who love baking and great customer experiences.</p>
          <a href="/contact" className="inline-block px-8 py-3 bg-golden text-white rounded-[8px] font-medium uppercase tracking-wider hover:bg-cinnamon transition-colors">
            Get in Touch
          </a>
        </section>
      </ScrollReveal>
    </main>
  );
}
