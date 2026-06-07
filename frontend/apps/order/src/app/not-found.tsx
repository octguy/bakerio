"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-display text-2xl">404</h1>
      <p className="text-espresso/60">Trang không tồn tại.</p>
      <Link href="/menu" className="underline underline-offset-4 hover:text-cinnamon">
        Quay lại thực đơn
      </Link>
    </div>
  );
}
