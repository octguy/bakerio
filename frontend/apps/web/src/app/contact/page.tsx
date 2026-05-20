"use client";

import { useState } from "react";
import Image from "next/image";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

const contactInfo = [
  { icon: MapPin, label: "Address", value: "123 Nguyễn Huệ, District 1, HCMC" },
  { icon: Phone, label: "Phone", value: "+84 28 1234 5678" },
  { icon: Mail, label: "Email", value: "hello@bakerio.vn" },
  { icon: Clock, label: "Hours", value: "Mon–Sun: 7:00 AM – 9:00 PM" },
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
      result.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setSubmitted(true);
  };

  return (
    <main>
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[300px] flex items-center justify-center">
        <Image src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1920&q=80" alt="" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(44,24,16,0.3)] to-[rgba(44,24,16,0.6)]" />
        <div className="relative text-center text-white z-10">
          <p className="font-[family-name:var(--font-script)] text-2xl md:text-3xl mb-2">we&apos;d love to hear from you</p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl font-bold">Get in Touch</h1>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 md:py-28 px-4 max-w-6xl mx-auto">
        <ScrollReveal>
          <div className="grid md:grid-cols-2 gap-12">
            {/* Form */}
            {submitted ? (
              <div className="flex items-center justify-center">
                <p className="text-lg font-medium text-golden">Thank you! Your message has been sent.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="contact-name" className="sr-only">Name</label>
                  <input id="contact-name" name="name" type="text" placeholder="Name" className="w-full px-4 py-3 bg-white border border-crust rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[var(--golden)]/20 focus:border-golden transition" />
                  {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
                </div>
                <div>
                  <label htmlFor="contact-email" className="sr-only">Email</label>
                  <input id="contact-email" name="email" type="email" placeholder="Email" className="w-full px-4 py-3 bg-white border border-crust rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[var(--golden)]/20 focus:border-golden transition" />
                  {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
                </div>
                <div>
                  <label htmlFor="contact-subject" className="sr-only">Subject</label>
                  <input id="contact-subject" name="subject" type="text" placeholder="Subject" className="w-full px-4 py-3 bg-white border border-crust rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[var(--golden)]/20 focus:border-golden transition" />
                  {fieldErrors.subject && <p className="text-red-500 text-xs mt-1">{fieldErrors.subject}</p>}
                </div>
                <div>
                  <label htmlFor="contact-message" className="sr-only">Message</label>
                  <textarea id="contact-message" name="message" placeholder="Message" rows={5} className="w-full px-4 py-3 bg-white border border-crust rounded-[6px] focus:outline-none focus:ring-2 focus:ring-[var(--golden)]/20 focus:border-golden transition resize-none" />
                  {fieldErrors.message && <p className="text-red-500 text-xs mt-1">{fieldErrors.message}</p>}
                </div>
                <button type="submit" className="px-8 py-3 bg-golden text-white rounded-[6px] font-medium uppercase tracking-wider hover:bg-cinnamon transition-colors">
                  Send Message
                </button>
              </form>
            )}

            {/* Info Cards */}
            <div className="space-y-4">
              {contactInfo.map((item) => (
                <div key={item.label} className="flex items-start gap-4 p-5 rounded-[10px] bg-white border border-crust transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(44,24,16,0.10)]">
                  <item.icon className="text-golden shrink-0 mt-0.5" size={22} />
                  <div>
                    <p className="font-[family-name:var(--font-display)] font-bold text-sm text-espresso">{item.label}</p>
                    <p className="text-cocoa text-sm mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>
    </main>
  );
}
