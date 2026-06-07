import { Link } from "next-view-transitions";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import VerifyEmailForm from "./verify-email-form";

interface VerifyEmailPageProps {
  searchParams: Promise<{
    user_id?: string;
    email?: string;
  }>;
}

export const unstable_instant = false;

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const t = await getTranslations("auth");

  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-7 pt-8 pb-24">
          <Link href="/register" className="mb-2 inline-flex items-center gap-2 text-[18px] text-espresso">
            ‹
          </Link>
          <span className="block font-script text-[26px] leading-none text-cinnamon">{t("checkYourInbox")}</span>
          <h1
            className="mt-1.5 font-display tracking-tight text-espresso"
            style={{ fontSize: "clamp(32px,9vw,38px)", lineHeight: 0.95, letterSpacing: "-0.02em" }}
          >
            {t("confirmYour")}
            <br />
            <span className="font-editorial text-cinnamon">{t("emailDot")}</span>
          </h1>
          <p className="mt-4 font-editorial text-[14px] italic leading-6 text-cocoa">
            {t("loadingVerification")}
          </p>
        </main>
      }
    >
      <VerifyEmailContent searchParams={searchParams} />
    </Suspense>
  );
}

async function VerifyEmailContent({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const t = await getTranslations("auth");

  return (
    <main className="mx-auto max-w-md px-7 pt-8 pb-24">
      <Link href="/register" className="mb-2 inline-flex items-center gap-2 text-[18px] text-espresso">
        ‹
      </Link>
      <span className="block font-script text-[26px] leading-none text-cinnamon">{t("checkYourInbox")}</span>
      <h1
        className="mt-1.5 font-display tracking-tight text-espresso"
        style={{ fontSize: "clamp(32px,9vw,38px)", lineHeight: 0.95, letterSpacing: "-0.02em" }}
      >
        {t("confirmYour")}
        <br />
        <span className="font-editorial text-cinnamon">{t("emailDot")}</span>
      </h1>
      <p className="mt-4 font-editorial text-[14px] italic leading-6 text-cocoa">
        {t("weSentCode", { email: params.email || t("yourEmail") })}
      </p>

      <VerifyEmailForm email={params.email ?? ""} userId={params.user_id ?? ""} />
    </main>
  );
}
