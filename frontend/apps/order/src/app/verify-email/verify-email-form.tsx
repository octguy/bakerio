"use client";

import { useMemo, useState } from "react";
import { Link } from "next-view-transitions";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { useTranslations } from "next-intl";

interface VerifyEmailFormProps {
  email: string;
  userId: string;
}

function normalizeOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export default function VerifyEmailForm({ email, userId }: VerifyEmailFormProps) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const canSubmit = useMemo(() => userId.length > 0 && otp.length === 6 && !loading, [loading, otp, userId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!userId) {
      setError(t("registrationMissing"));
      return;
    }
    if (otp.length !== 6) {
      setError(t("enterOtp"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", user_id: userId, otp }),
      });
      const data = await res.json().catch(() => ({ error: t("unexpectedResponse") }));
      if (!res.ok || data.error || data.verified === false) {
        setError(data.error ?? t("codeDidNotWork"));
        return;
      }
      setVerified(true);
      window.setTimeout(() => router.push("/login"), 900);
    } catch {
      setError(t("unableToVerify"));
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <section className="mt-7 rounded-2xl border border-sage/40 bg-white px-5 py-6 text-center shadow-[0_18px_55px_rgba(58,38,24,0.08)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage/15 font-mono text-[18px] text-sage">
          ✓
        </div>
        <h2 className="mt-4 font-display text-[28px] tracking-tight text-espresso">{t("verified")}</h2>
        <p className="mt-2 font-editorial text-[14px] italic text-cocoa">{t("accountReady")}</p>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-4">
      <div>
        <label htmlFor="verify-otp" className="block font-mono text-[9.5px] uppercase tracking-[0.18em] text-caramel">
          {t("verificationCode")}
        </label>
        <input
          id="verify-otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          value={otp}
          onChange={(e) => setOtp(normalizeOtp(e.target.value))}
          placeholder="123456"
          className="mt-1 w-full rounded-xl border-2 border-cinnamon bg-white px-4 py-4 text-center font-mono text-[22px] tracking-[0.28em] text-espresso placeholder:text-caramel focus:outline-none focus:ring-2 focus:ring-cinnamon/40"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-sienna/30 bg-sienna/10 px-3 py-2 text-center font-mono text-[11px] text-sienna">
          {error}
        </p>
      )}

      <button
        disabled={!canSubmit}
        className="bkr-press inline-flex w-full items-center justify-center rounded-full bg-espresso px-5 py-4 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-cream disabled:opacity-50"
      >
        {loading ? t("verifying") : t("verifyEmail")}
      </button>

      <p className="text-center font-editorial text-[12.5px] italic text-caramel">
        {t("wrongAddress")}{" "}
        <Link href={`/register${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="font-sans font-semibold not-italic text-cinnamon">
          {t("registerAgain")}
        </Link>
      </p>
    </form>
  );
}
