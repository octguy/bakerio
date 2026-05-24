import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex flex-1 items-center justify-center px-6 py-32">
      <div className="text-center">
        <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-cinnamon">
          ◆ fig. 404 · loaf not found
        </div>
        <h1
          className="font-display tracking-tight text-espresso"
          style={{ fontSize: "clamp(60px,10vw,120px)", lineHeight: 0.9, letterSpacing: "-0.025em" }}
        >
          We searched <span className="font-editorial text-cinnamon">every shelf.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md font-news text-[16px] leading-[1.55] text-cocoa">
          The page you&apos;re looking for has sold out — or perhaps it never came out of the oven. The dough
          rests; the journey continues.
        </p>
        <Link
          href="/"
          className="bkr-press mt-9 inline-flex items-center gap-2 rounded-full bg-espresso px-6 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-cream"
        >
          Back to the counter <span>→</span>
        </Link>
      </div>
    </section>
  );
}
