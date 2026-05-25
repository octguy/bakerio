"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const err = await login(email, password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    router.push("/");
  };

  return (
    <div className="flex h-full overflow-hidden bg-cream text-espresso">
      {/* Form */}
      <section className="flex flex-1 min-w-0 flex-col justify-between px-12 py-16 lg:px-20">
        <div className="flex items-baseline gap-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 22V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M12 8c-2-1.5-3.5-3.2-3.5-5C8.5 1.5 10 1 12 1s3.5.5 3.5 2c0 1.8-1.5 3.5-3.5 5z" stroke="currentColor" strokeWidth="1.3" />
            <path d="M12 12c-2.5-.5-4.5-1.7-4.5-3.5 0-1 .5-1.7 1.5-2 1.5 1 2.5 2.7 3 5.5z" stroke="currentColor" strokeWidth="1.2" />
            <path d="M12 12c2.5-.5 4.5-1.7 4.5-3.5 0-1-.5-1.7-1.5-2-1.5 1-2.5 2.7-3 5.5z" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span className="font-display text-[22px] tracking-tight">Bakerio</span>
        </div>

        <div className="max-w-[440px]">
          <div className="mb-4 flex items-center gap-3">
            <span className="block h-px w-7 bg-golden" />
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-cinnamon">
              Bakerio Ops · staff only
            </span>
          </div>
          <h1
            className="bkr-rise-1 font-display tracking-tight"
            style={{ fontSize: "clamp(48px,7vw,72px)", lineHeight: 0.9, letterSpacing: "-0.025em" }}
          >
            Welcome back, <span className="font-editorial text-cinnamon">baker.</span>
          </h1>
          <p className="mt-5 font-news text-[16px] leading-[1.5] text-cocoa">
            The counter is waiting. Sign in with your work email to pick up where you left off — pending orders,
            kitchen queue, inventory.
          </p>

          <form onSubmit={handleSubmit} className="mt-9 flex flex-col gap-4">
            <div>
              <label
                htmlFor="email"
                className="block font-mono text-[10px] uppercase tracking-[0.2em] text-caramel"
              >
                Work email
              </label>
              <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-crust bg-white px-4 py-3.5">
                <span className="text-caramel" aria-hidden="true">✉</span>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="thinh@bakerio.vn"
                  className="flex-1 bg-transparent font-editorial text-[15px] italic text-espresso outline-none placeholder:text-caramel"
                />
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="password" className="font-mono text-[10px] uppercase tracking-[0.2em] text-caramel">
                  Password
                </label>
                <button
                  type="button"
                  disabled
                  aria-label="Forgot password? Reset is unavailable/coming soon."
                  className="cursor-default font-mono text-[10.5px] font-bold tracking-[0.16em] text-cinnamon"
                >
                  FORGOT?
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2.5 rounded-xl border-2 border-cinnamon bg-white px-4 py-3.5">
                <span className="text-caramel" aria-hidden="true">🔑</span>
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••••"
                  className={`flex-1 bg-transparent text-[16px] text-espresso outline-none ${
                    showPw ? "" : "font-mono tracking-[0.3em]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  aria-pressed={showPw}
                  className="text-caramel"
                >
                  <span aria-hidden="true">👁</span>
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-[12.5px] text-cocoa">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 accent-cinnamon"
              />
              Remember this device for 30 days
            </label>

            {error && (
              <p className="rounded-md border border-sienna/30 bg-sienna/10 px-3 py-2 font-mono text-[11px] text-sienna">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bkr-press inline-flex items-center justify-center gap-2 rounded-full bg-espresso px-5 py-4 font-mono text-[12px] font-semibold uppercase tracking-[0.06em] text-cream disabled:opacity-50"
            >
              {loading ? "Signing in…" : <>Sign in to ops <span aria-hidden="true">→</span></>}
            </button>

            <div className="rounded-lg border border-dashed border-crust-deep bg-butter px-4 py-3.5">
              <div className="flex gap-2.5 font-editorial text-[13px] italic text-cocoa">
                <span className="not-italic text-cinnamon" aria-hidden="true">♢</span>
                <span>
                  If you&apos;re a customer, you want the{" "}
                  <strong className="font-sans not-italic text-cinnamon">order app</strong>, not this.{" "}
                  <span className="font-sans not-italic font-bold text-cinnamon">order.bakerio.vn ↗</span>
                </span>
              </div>
            </div>
          </form>
        </div>

        <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-caramel">
          © Bakerio mmxxiv–mmxxvi · 11 shops · Saigon
        </div>
      </section>

      {/* Photo */}
      <section className="relative hidden flex-1 overflow-hidden lg:block" style={{ flex: 1.05 }}>
        <Image
          src="https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=1600&q=85&auto=format"
          alt="Baker at work"
          fill
          priority
          className="object-cover"
          sizes="50vw"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(44,24,16,0.15) 0%, rgba(44,24,16,0.5) 100%)" }}
        />

        <div
          className="bkr-float absolute left-20 top-20 flex h-[140px] w-[140px] flex-col items-center justify-center rounded-full bg-cinnamon text-cream shadow-[0_12px_30px_rgba(44,24,16,0.4)]"
          style={{ ["--rot" as string]: "-8deg", transform: "rotate(-8deg)" }}
        >
          <span className="font-script text-[38px] leading-[0.9]">baked</span>
          <span className="font-script text-[30px] leading-[0.9] text-honey">fresh</span>
          <span className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.2em]">since mmxxiv</span>
        </div>

        <div className="absolute inset-x-20 bottom-20 max-w-[480px] text-white">
          <div
            className="font-display tracking-tight"
            style={{ fontSize: "clamp(28px,3.6vw,36px)", lineHeight: 1.15, letterSpacing: "-0.01em" }}
          >
            &ldquo;The dough does its work in the dark.{" "}
            <span className="font-editorial text-honey">Our job is only to come back.</span>&rdquo;
          </div>
          <div className="mt-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] opacity-85">
            <span className="block h-px w-6 bg-honey" />
            Linh Phạm · head baker
          </div>
        </div>
      </section>
    </div>
  );
}
