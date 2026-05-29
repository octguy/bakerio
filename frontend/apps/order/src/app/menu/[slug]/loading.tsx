export default function Loading() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden px-4 pt-4 pb-28 sm:px-6 md:px-8 md:py-10 xl:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_14%_0%,rgba(232,169,78,0.18),transparent_24%),linear-gradient(135deg,var(--cream)_0%,var(--vanilla)_56%,#f4dfbd_100%)]" />
      <div className="mx-auto grid w-full max-w-[1280px] animate-pulse gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.72fr)]">
        <section>
          <div className="mb-4 h-11 w-36 rounded-full bg-crust" />
          <div className="aspect-[4/3] min-h-[300px] rounded-[2rem] bg-crust sm:min-h-[420px] lg:aspect-[5/4] lg:rounded-[2.75rem]" />
        </section>
        <section className="rounded-[2rem] border border-crust-deep bg-white/70 p-5 md:p-7 lg:rounded-[2.5rem]">
          <div className="h-4 w-36 rounded-full bg-crust" />
          <div className="mt-4 h-24 rounded-[1.5rem] bg-crust" />
          <div className="mt-5 h-20 rounded-[1.5rem] bg-crust" />
          <div className="my-6 h-16 rounded-[1.5rem] bg-crust" />
          <div className="h-14 rounded-full bg-crust" />
        </section>
      </div>
    </main>
  );
}
