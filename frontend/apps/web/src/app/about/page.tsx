import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — One oven, eleven shops",
  description: "Bakerio started in 2024 with one oven on Lê Lợi. Two years later, eleven shops across Saigon — same dough, same cloth.",
};

const PILLARS = [
  {
    n: "01",
    title: "Sourdough",
    sub: "Levain · 48-hour ferment",
    body: "A wild starter we keep on rotation — wheat from Đà Lạt, water filtered, salt from Phú Quốc. Time does the rest.",
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1200&q=85&auto=format",
  },
  {
    n: "02",
    title: "Pâtisserie",
    sub: "AOP butter · 81 layers",
    body: "Lamination by hand at 4 a.m. before the city wakes. The butter does what the butter does best.",
    image: "https://images.unsplash.com/photo-1568051243851-f9b136146e97?w=1200&q=85&auto=format",
  },
  {
    n: "03",
    title: "Bánh mì",
    sub: "Saigon · since 2024",
    body: "Our own recipe — a thinner crust, a softer crumb. Pâté made every morning. Chả lụa from the family in Long An.",
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1400&q=85&auto=format",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-cream text-espresso">
      {/* Hero — split */}
      <section className="px-6 pt-32 pb-12 lg:px-14 lg:pt-40">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="block h-px w-7 bg-golden" />
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-cinnamon">§ i — Our story</span>
            </div>
            <h1
              className="font-display tracking-tight"
              style={{ fontSize: "clamp(56px,9vw,96px)", lineHeight: 0.92, letterSpacing: "-0.025em" }}
            >
              We started{" "}
              <br />
              with one <span className="font-editorial text-cinnamon">oven.</span>
            </h1>
            <p className="mt-7 max-w-[480px] font-news text-[17px] leading-[1.55] text-cocoa">
              In 2024, Linh and Khoa opened a 14m² shop on Lê Lợi with a stone oven, a stand mixer, and a single
              recipe their grandmother used to fold by hand. Two years later there are eleven shops, but the same
              dough still rests under the same cloth.
            </p>
            <div className="mt-8 flex gap-8">
              {[
                { n: "mmxxiv", l: "Established" },
                { n: "11", l: "Shops" },
                { n: "46", l: "Bakers" },
              ].map((d) => (
                <div key={d.l}>
                  <div className="font-display text-[32px] leading-none text-espresso">{d.n}</div>
                  <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-caramel">{d.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative h-[540px]">
            <div className="absolute right-0 top-0 h-[380px] w-[78%] overflow-hidden rounded-sm shadow-[0_24px_50px_-20px_rgba(44,24,16,0.4)]">
              <Image
                src="https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=1600&q=85&auto=format"
                alt="Baker at work"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
            </div>
            <div
              className="absolute bottom-0 left-0 h-[260px] w-[54%] overflow-hidden rounded-sm border-[6px] border-white shadow-[0_16px_30px_-10px_rgba(44,24,16,0.3)]"
              style={{ transform: "rotate(-3deg)" }}
            >
              <Image
                src="https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1400&q=85&auto=format"
                alt="Sourdough loaves resting"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 60vw, 30vw"
              />
            </div>
            <div
              className="absolute right-[-8px] top-[168px] hidden border border-crust bg-cream px-4 py-3 font-script text-[28px] text-cinnamon md:block"
              style={{ transform: "rotate(4deg)" }}
            >
              made by hand
            </div>
          </div>
        </div>
      </section>

      {/* The craft — three pillars */}
      <section className="px-6 py-16 lg:px-14 lg:py-20">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-8 flex items-baseline justify-between border-b border-crust pb-5">
            <h2
              className="font-display tracking-tight text-espresso"
              style={{ fontSize: "clamp(28px,4vw,44px)", letterSpacing: "-0.02em" }}
            >
              The craft, <span className="font-editorial text-cinnamon">three ways.</span>
            </h2>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-caramel">
              FIG. 02 · WHAT WE BAKE
            </span>
          </div>

          <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
            {PILLARS.map((p) => (
              <article key={p.n}>
                <div className="relative mb-4 h-[280px] overflow-hidden rounded-sm">
                  <Image src={p.image} alt={p.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-cinnamon">FIG. 02.{p.n}</span>
                <h3 className="mt-1 font-display text-[28px] tracking-tight">{p.title}</h3>
                <div className="mb-2 font-editorial text-[14px] text-cinnamon">{p.sub}</div>
                <p className="font-news text-[15px] leading-[1.5] text-cocoa">{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Pull-quote */}
      <section className="bg-espresso px-6 py-20 text-cream lg:px-14 lg:py-24">
        <div className="mx-auto flex max-w-[880px] items-start gap-9">
          <div className="font-display text-[120px] leading-[0.6] text-honey">“</div>
          <div>
            <p
              className="font-display tracking-tight"
              style={{ fontSize: "clamp(24px,3.6vw,36px)", lineHeight: 1.2, letterSpacing: "-0.01em" }}
            >
              The trick isn&apos;t the crust, or the crumb, or even the butter. It&apos;s{" "}
              <span className="font-editorial text-honey">showing up</span> before everyone else, and caring more
              than the recipe asks you to.
            </p>
            <div className="mt-6 flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cinnamon font-display text-[16px] text-cream">
                L
              </div>
              <div>
                <div className="font-semibold">Linh Phạm</div>
                <div className="font-editorial text-[13px] text-honey">Founder · Head baker</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
