"use client";

import { useTranslations } from "next-intl";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-xl font-semibold mb-2">{t("errorProduct")}</h2>
      <p className="text-gray-600 mb-4">{t("errorRetryDesc")}</p>
      <button onClick={reset} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
        {t("retry")}
      </button>
    </div>
  );
}
