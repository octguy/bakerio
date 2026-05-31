"use client";

import { MenuLocationHeader } from "./menu-location-header";

export function MenuLayoutClient({
  catalogSection,
}: {
  catalogSection: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col lg:items-start">
      <section className="min-w-0 w-full lg:pt-2">
        <MenuLocationHeader />
        {catalogSection}
      </section>
    </div>
  );
}
