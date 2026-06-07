import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <section className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="max-w-md mx-auto">
        <p className="text-brand-500 font-bold text-6xl mb-4">404</p>
        <h1 className="text-3xl font-bold text-foreground mb-4">{t("pageNotFound")}</h1>
        <p className="text-muted-foreground mb-8">
          {t("pageNotFoundDesc")}
        </p>
        <Link 
          href="/" 
          className="inline-block bg-brand-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-brand-600 transition-colors"
        >
          {t("backToDashboard")}
        </Link>
      </div>
    </section>
  );
}
