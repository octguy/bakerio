export function MenuEmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 px-4">
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-butter/50 shadow-inner">
        <div className="absolute inset-0 rounded-full border border-dashed border-caramel/40 animate-[spin_10s_linear_infinite]" />
        <span className="font-display text-[40px] text-cinnamon">!</span>
      </div>
      <h3 className="mb-2 text-center font-display text-[32px] leading-none tracking-tight text-espresso">
        The oven is empty.
      </h3>
      <p className="mb-6 max-w-[280px] text-center font-editorial text-[15px] italic leading-snug text-caramel">
        We couldn&apos;t find any warm treats matching your current selection.
      </p>
      <button
        onClick={onReset}
        className="rounded-full bg-espresso px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-white shadow-[0_8px_20px_-8px_rgba(44,24,16,0.6)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
      >
        Reset Filters
      </button>
    </div>
  );
}
