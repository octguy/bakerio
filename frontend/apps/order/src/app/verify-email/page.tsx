import Link from "next/link";
import { Suspense } from "react";
import VerifyEmailForm from "./verify-email-form";

interface VerifyEmailPageProps {
  searchParams: Promise<{
    user_id?: string;
    email?: string;
  }>;
}

export const unstable_instant = false;

export default function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent searchParams={searchParams} />
    </Suspense>
  );
}

async function VerifyEmailContent({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto max-w-md px-7 pt-8 pb-24">
      <Link href="/register" className="mb-2 inline-flex items-center gap-2 text-[18px] text-espresso">
        ‹
      </Link>
      <span className="block font-script text-[26px] leading-none text-cinnamon">check your inbox,</span>
      <h1
        className="mt-1.5 font-display tracking-tight text-espresso"
        style={{
          fontSize: "clamp(32px,9vw,38px)",
          lineHeight: 0.95,
          letterSpacing: "-0.02em",
        }}
      >
        Confirm your
        <br />
        <span className="font-editorial text-cinnamon">email.</span>
      </h1>
      <p className="mt-4 font-editorial text-[14px] italic leading-6 text-cocoa">
        We sent a 6-digit code to{" "}
        <span className="font-sans not-italic text-espresso">{params.email || "your email"}</span>. Enter it below to
        activate ordering.
      </p>

      <VerifyEmailForm email={params.email ?? ""} userId={params.user_id ?? ""} />
    </main>
  );
}

function VerifyEmailFallback() {
  return (
    <main className="mx-auto max-w-md px-7 pt-8 pb-24">
      <Link href="/register" className="mb-2 inline-flex items-center gap-2 text-[18px] text-espresso">
        ‹
      </Link>
      <span className="block font-script text-[26px] leading-none text-cinnamon">check your inbox,</span>
      <h1
        className="mt-1.5 font-display tracking-tight text-espresso"
        style={{
          fontSize: "clamp(32px,9vw,38px)",
          lineHeight: 0.95,
          letterSpacing: "-0.02em",
        }}
      >
        Confirm your
        <br />
        <span className="font-editorial text-cinnamon">email.</span>
      </h1>
      <p className="mt-4 font-editorial text-[14px] italic leading-6 text-cocoa">
        Loading verification details…
      </p>
    </main>
  );
}
