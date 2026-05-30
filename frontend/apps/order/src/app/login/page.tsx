"use client";

import { useState } from "react";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { Link } from "next-view-transitions";
import { useAuth } from "@/lib/auth";
import { loginSchema } from "./schema";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((i) => {
        errs[i.path[0] as string] = i.message;
      });
      setFieldErrors(errs);
      return;
    }

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
    <main className="mx-auto max-w-md px-7 pt-10 pb-24">
      <span className="block font-script text-[30px] leading-none text-cinnamon">welcome back,</span>
      <h1
        className="mt-1.5 font-display tracking-tight text-espresso"
        style={{
          fontSize: "clamp(36px,10vw,44px)",
          lineHeight: 0.95,
          letterSpacing: "-0.02em",
        }}
      >
        Pick up your
        <br />
        <span className="font-editorial text-cinnamon">order.</span>
      </h1>

      <form onSubmit={handleSubmit} className="mt-9 space-y-4">
        <div>
          <label htmlFor="login-email" className="block font-mono text-[10px] uppercase tracking-[0.18em] text-caramel">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="thinh@bakerio.vn"
            className="mt-2 w-full rounded-xl border border-crust bg-white px-4 py-3.5 font-editorial text-[15px] text-espresso italic placeholder:text-caramel focus:border-cinnamon focus:outline-none focus:ring-2 focus:ring-cinnamon/30"
          />
          {fieldErrors.email && <p className="mt-1 font-mono text-[11px] text-sienna">{fieldErrors.email}</p>}
        </div>

        <div>
          <label htmlFor="login-password" className="block font-mono text-[10px] uppercase tracking-[0.18em] text-caramel">
            Password
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border-2 border-cinnamon bg-white px-4 py-3.5 focus-within:ring-2 focus-within:ring-cinnamon/40">
            <input
              id="login-password"
              type={showPw ? "text" : "password"}
              name="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••••••"
              className={`flex-1 bg-transparent text-[15px] text-espresso outline-none ${showPw ? "" : "font-mono tracking-[0.3em]"}`}
            />
            <button
              type="button"
              aria-pressed={showPw}
              onClick={() => setShowPw((s) => !s)}
              className="text-caramel"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              <span aria-hidden="true">👁</span>
            </button>
          </div>
          {fieldErrors.password && <p className="mt-1 font-mono text-[11px] text-sienna">{fieldErrors.password}</p>}
        </div>

        <div className="text-right">
          <button
            type="button"
            disabled
            aria-label="Forgot password? Reset is unavailable/coming soon."
            className="font-mono text-[11px] font-bold tracking-[0.16em] text-cinnamon cursor-default"
          >
            FORGOT?
          </button>
        </div>

        {error && <p className="rounded-md border border-sienna/30 bg-sienna/10 px-3 py-2 text-center font-mono text-[11px] text-sienna">{error}</p>}

        <button
          disabled={loading}
          className="bkr-press w-full rounded-full bg-espresso px-5 py-4 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-cream disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-7 flex items-center gap-2.5 font-mono text-[11px] tracking-[0.12em] text-caramel">
        <div className="h-px flex-1 bg-crust" />
        OR
        <div className="h-px flex-1 bg-crust" />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {[{ l: "Continue with Apple" }, { l: "Continue with Google" }].map((b) => (
          <button
            key={b.l}
            type="button"
            disabled
            className="flex items-center justify-between rounded-xl border border-crust bg-white/50 px-4 py-3.5 text-[13.5px] font-semibold text-espresso/40 cursor-not-allowed"
          >
            <span>{b.l}</span>
            <span className="rounded bg-caramel/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-caramel">coming soon</span>
          </button>
        ))}
      </div>

      <p className="mt-7 text-center font-editorial text-[13px] text-caramel">
        New here?{" "}
        <Link href="/register" className="font-sans font-semibold text-cinnamon not-italic">
          Create an account <span aria-hidden="true">→</span>
        </Link>
      </p>
    </main>
  );
}
