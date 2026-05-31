"use client";

import { useState } from "react";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { Link } from "next-view-transitions";
import { useAuth } from "@/lib/auth";
import { registerSchema } from "./schema";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const validation = registerSchema.safeParse({ name, email, password });
    if (!validation.success) {
      const errs: Record<string, string> = {};
      validation.error.issues.forEach((i) => {
        errs[i.path[0] as string] = i.message;
      });
      setFieldErrors(errs);
      return;
    }
    if (!agreed) {
      setError("Please accept the terms to continue.");
      return;
    }

    setLoading(true);
    const result = await register(email, password, name);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    const params = new URLSearchParams();
    if (result.userId) params.set("user_id", result.userId);
    params.set("email", result.email ?? email);
    router.push(`/verify-email?${params.toString()}`);
  };

  return (
    <main className="mx-auto max-w-md px-7 pt-8 pb-24">
      <Link href="/login" className="mb-2 inline-flex items-center gap-2 text-[18px] text-espresso">
        ‹
      </Link>
      <span className="block font-script text-[26px] leading-none text-cinnamon">nice to meet you,</span>
      <h1
        className="mt-1.5 font-display tracking-tight text-espresso"
        style={{
          fontSize: "clamp(32px,9vw,38px)",
          lineHeight: 0.95,
          letterSpacing: "-0.02em",
        }}
      >
        Let&apos;s set you
        <br />
        <span className="font-editorial text-cinnamon">up.</span>
      </h1>

      <form onSubmit={handleSubmit} className="mt-7 space-y-3.5">
        {[
          {
            name: "name",
            label: "Full name",
            value: name,
            set: setName,
            placeholder: "Thinh Nguyễn",
            type: "text",
          },
          {
            name: "email",
            label: "Email",
            value: email,
            set: setEmail,
            placeholder: "thinh@bakerio.vn",
            type: "email",
          },
        ].map((f) => (
          <div key={f.name}>
            <label htmlFor={`reg-${f.name}`} className="block font-mono text-[9.5px] uppercase tracking-[0.18em] text-caramel">
              {f.label}
            </label>
            <input
              id={`reg-${f.name}`}
              type={f.type}
              name={f.name}
              required
              autoComplete={f.type === "email" ? "email" : f.name}
              spellCheck={f.type === "email" ? false : undefined}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              placeholder={f.placeholder}
              className="mt-1 w-full rounded-xl border border-crust bg-white px-3.5 py-3 font-editorial text-[14px] italic text-espresso placeholder:text-caramel focus:border-cinnamon focus:outline-none focus:ring-2 focus:ring-cinnamon/30"
            />
            {fieldErrors[f.name] && <p className="mt-1 font-mono text-[11px] text-sienna">{fieldErrors[f.name]}</p>}
          </div>
        ))}

        <div>
          <label htmlFor="reg-password" className="block font-mono text-[9.5px] uppercase tracking-[0.18em] text-caramel">
            Password
          </label>
          <input
            id="reg-password"
            type="password"
            name="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1 w-full rounded-xl border-2 border-cinnamon bg-white px-3.5 py-3 font-mono text-[14px] tracking-[0.25em] text-espresso placeholder:text-caramel focus:outline-none focus:ring-2 focus:ring-cinnamon/40"
          />
          {fieldErrors.password && <p className="mt-1 font-mono text-[11px] text-sienna">{fieldErrors.password}</p>}
        </div>

        <label className="mt-3 flex items-start gap-2 text-[11.5px] leading-[1.4] text-cocoa">
          <input type="checkbox" aria-label="I agree to terms and conditions" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-cinnamon" />
          <span className="font-editorial italic">
            I agree to the <strong className="font-sans not-italic text-cinnamon">terms</strong> and{" "}
            <strong className="font-sans not-italic text-cinnamon">crumb-collecting policy</strong>.
          </span>
        </label>

        {error && <p className="rounded-md border border-sienna/30 bg-sienna/10 px-3 py-2 text-center font-mono text-[11px] text-sienna">{error}</p>}

        <button
          disabled={loading}
          className="bkr-press mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-espresso px-5 py-4 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-cream disabled:opacity-50"
        >
          {loading ? "Sending…" : "Send verification code →"}
        </button>
      </form>

      <p className="mt-6 text-center font-editorial text-[13px] text-caramel">
        Already a member?{" "}
        <Link href="/login" className="font-sans font-semibold text-cinnamon not-italic">
          Sign in →
        </Link>
      </p>
    </main>
  );
}
