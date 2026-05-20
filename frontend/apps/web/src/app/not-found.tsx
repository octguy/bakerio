import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex-1 flex items-center justify-center px-6 py-24">
      <div className="text-center">
        <p className="font-[family-name:var(--font-script)] text-4xl text-golden mb-2">oops</p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-espresso mb-4">Page Not Found</h1>
        <p className="text-cocoa mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link href="/" className="inline-block bg-golden text-white px-8 py-3 rounded-[8px] font-medium hover:bg-cinnamon transition-colors">
          Back to Home
        </Link>
      </div>
    </section>
  );
}
