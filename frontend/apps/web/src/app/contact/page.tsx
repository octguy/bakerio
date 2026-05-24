"use client";

import { useState } from "react";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

const contactInfo = [
  { icon: MapPin, label: "Address", value: "42 Lê Lợi, Bến Nghé, Q.1, HCMC" },
  { icon: Phone, label: "Phone", value: "+84 28 1234 5678" },
  { icon: Mail, label: "Email", value: "hello@bakerio.vn" },
  { icon: Clock, label: "Hours", value: "Every day · 06:00 — 22:00" },
];

export default function ContactPage() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
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
      return;
    }
    setFieldErrors({});
    setSubmitted(true);
  };

  return (
    <main className="bg-cream text-espresso">
      <section className="px-6 pt-32 pb-12 lg:px-14 lg:pt-40">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-4 flex items-center gap-3">
            <span className="block h-px w-7 bg-golden" />
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-cinnamon">
              § iv — say hello
            </span>
          </div>
          <h1
            className="font-display tracking-tight"
            style={{ fontSize: "clamp(48px,8vw,72px)", lineHeight: 0.9, letterSpacing: "-0.025em" }}
          >
            We&apos;d love to <span className="font-editorial text-cinnamon">hear from you.</span>
          </h1>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-6 pb-24 lg:grid-cols-2 lg:px-14">
        {/* Form */}
        {submitted ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-sm border border-crust bg-white p-10 text-center">
            <div>
              <div className="font-display text-[40px] tracking-tight text-cinnamon">Thank you.</div>
              <p className="mt-3 font-editorial text-[16px] text-cocoa">
                We&apos;ll write back from the bakery — usually within the same day.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {[
              { name: "name", label: "Your name", placeholder: "Linh Phạm" },
              { name: "email", label: "Email", placeholder: "you@example.com" },
              { name: "subject", label: "Subject", placeholder: "What's on your mind?" },
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
                  placeholder={f.placeholder}
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
                Message
              </label>
              <textarea
                id="contact-message"
                name="message"
                placeholder="Tell us what you're thinking…"
                rows={5}
                className="w-full resize-none rounded-md border border-crust bg-white px-4 py-3.5 text-[15px] text-espresso outline-none transition focus:border-cinnamon focus:ring-2 focus:ring-cinnamon/15"
              />
              {fieldErrors.message && (
                <p className="mt-1 font-mono text-[11px] text-sienna">{fieldErrors.message}</p>
              )}
            </div>
            <button
              type="submit"
              className="bkr-press inline-flex items-center gap-2 rounded-full bg-espresso px-6 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-cream"
            >
              Send message <span>→</span>
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
              ♢ Wholesale & press
            </div>
            <p className="font-editorial text-[14px] text-cocoa">
              For trade enquiries, write to <strong className="font-sans not-italic text-cinnamon">trade@bakerio.vn</strong>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
