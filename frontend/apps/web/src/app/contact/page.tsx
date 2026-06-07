"use client";

import { useEffect, useState } from "react";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { getContactEndpoint } from "@/lib/public-config";

export default function ContactPage() {
  const t = useTranslations("contact");

  const contactSchema = z.object({
    name: z.string().min(1, t("nameRequired")),
    email: z.string().email(t("emailInvalid")),
    subject: z.string().min(1, t("subjectRequired")),
    message: z.string().min(1, t("messageRequired")),
  });

  const contactInfo = [
    { icon: MapPin, label: t("address"), value: "42 Lê Lợi, Bến Nghé, Q.1, HCMC" },
    { icon: Phone, label: t("phone"), value: "+84 28 1234 5678" },
    { icon: Mail, label: t("email"), value: "admin@thinhuit.id.vn" },
    { icon: Clock, label: t("hours"), value: "Every day · 06:00 — 22:00" },
  ];

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitState, setSubmitState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
    };

    const result = contactSchema.safeParse(data);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((i) => {
        errs[i.path[0] as string] = i.message;
      });
      setFieldErrors(errs);
      setSubmitError(null);
      setSubmitState("idle");
      return;
    }

    setFieldErrors({});
    setSubmitError(null);
    setSubmitState("pending");

    try {
      const contactEndpoint = getContactEndpoint();
      if (!contactEndpoint) {
        throw new Error(t("notConfigured"));
      }

      const response = await fetch(contactEndpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result.data),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        let message = t("genericError");

        if (contentType.includes("application/json")) {
          const body = await response.json().catch(() => null);
          message = body?.error?.message || body?.message || message;
        } else {
          const text = await response.text().catch(() => "");
          message = text.trim() || message;
        }

        throw new Error(message);
      }

      form.reset();
      setIsDirty(false);
      setSubmitState("success");
    } catch (error) {
      setSubmitState("error");
      setSubmitError(
        error instanceof Error ? error.message : t("genericError"),
      );
    }
  };

  return (
    <div className="bg-cream text-espresso">
      <section className="px-6 pt-32 pb-12 lg:px-14 lg:pt-40">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-4 flex items-center gap-3">
            <span className="block h-px w-7 bg-golden" />
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-cinnamon">
              {t("sectionLabel")}
            </span>
          </div>
          <h1
            className="font-display tracking-tight"
            style={{ fontSize: "clamp(48px,8vw,72px)", lineHeight: 0.9, letterSpacing: "-0.025em" }}
          >
            {t("title")} <span className="font-editorial text-cinnamon">{t("titleAccent")}</span>
          </h1>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-6 pb-24 lg:grid-cols-2 lg:px-14">
        {/* Form */}
        {submitState === "success" ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-sm border border-crust bg-white p-10 text-center">
            <div>
              <div className="font-display text-[40px] tracking-tight text-cinnamon">{t("thankYou")}</div>
              <p className="mt-3 font-editorial text-[16px] text-cocoa">
                {t("thankYouDesc")}
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            onChangeCapture={() => setIsDirty(true)}
            className="space-y-5"
            aria-busy={submitState === "pending"}
          >
            {[
              { name: "name", label: t("nameLabel"), placeholder: t("namePlaceholder") },
              { name: "email", label: t("emailLabel"), placeholder: t("emailPlaceholder") },
              { name: "subject", label: t("subjectLabel"), placeholder: t("subjectPlaceholder") },
            ].map((f) => (
              <div key={f.name}>
                <label
                  htmlFor={`contact-${f.name}`}
                  className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-caramel"
                >
                  {f.label}
                </label>
                <input
                  id={`contact-${f.name}`}
                  name={f.name}
                  type={f.name === "email" ? "email" : "text"}
                  autoComplete={f.name === "email" ? "email" : undefined}
                  spellCheck={f.name === "email" ? false : undefined}
                  placeholder={f.placeholder}
                  disabled={submitState === "pending"}
                  className="w-full rounded-md border border-crust bg-white px-4 py-3.5 text-[15px] text-espresso outline-none transition focus:border-cinnamon focus:ring-2 focus:ring-cinnamon/15"
                />
                {fieldErrors[f.name] && (
                  <p className="mt-1 font-mono text-[11px] text-sienna">{fieldErrors[f.name]}</p>
                )}
              </div>
            ))}
            <div>
              <label
                htmlFor="contact-message"
                className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-caramel"
              >
                {t("messageLabel")}
              </label>
              <textarea
                id="contact-message"
                name="message"
                placeholder={t("messagePlaceholder")}
                rows={5}
                disabled={submitState === "pending"}
                className="w-full resize-none rounded-md border border-crust bg-white px-4 py-3.5 text-[15px] text-espresso outline-none transition focus:border-cinnamon focus:ring-2 focus:ring-cinnamon/15"
              />
              {fieldErrors.message && (
                <p className="mt-1 font-mono text-[11px] text-sienna">{fieldErrors.message}</p>
              )}
            </div>
            {submitError && (
              <p
                role="alert"
                className="rounded-md border border-sienna/20 bg-sienna/10 px-4 py-3 font-news text-[14px] text-sienna"
              >
                {submitError}
              </p>
            )}
            <button
              type="submit"
              disabled={submitState === "pending"}
              className="bkr-press inline-flex items-center gap-2 rounded-full bg-espresso px-6 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-cream"
            >
              {submitState === "pending" ? t("sending") : t("send")} <span>→</span>
            </button>
          </form>
        )}

        {/* Info */}
        <div className="space-y-3">
          {contactInfo.map((item) => (
            <div
              key={item.label}
              className="bkr-lift flex items-start gap-4 rounded-sm border border-crust bg-white p-5"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-butter text-cinnamon">
                <item.icon size={18} />
              </div>
              <div>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-caramel">{item.label}</p>
                <p className="mt-1 font-display text-[20px] leading-tight text-espresso">{item.value}</p>
              </div>
            </div>
          ))}

          <div className="mt-6 rounded-sm border border-crust-deep bg-butter p-5">
            <div className="mb-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-cinnamon">
              {t("wholesaleTitle")}
            </div>
            <p className="font-editorial text-[14px] text-cocoa">
              {t("wholesaleDesc")} <strong className="font-sans not-italic text-cinnamon">admin@thinhuit.id.vn</strong>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
