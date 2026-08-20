import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex flex-1 min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center bg-brand-bg">
      <section className="flex flex-col items-center">
        <div
          aria-hidden="true"
          className="pointer-events-none select-none text-8xl sm:text-[132px] font-semibold leading-none text-brand-text/15"
        >
          404
        </div>

        <h1 className="mt-3 text-2xl font-medium leading-tight text-brand-text">
          Nothing to see here.
        </h1>

        <Link href="/" className="link-action mt-2 text-sm">
          Find something new
        </Link>
      </section>

      <div className="absolute bottom-8 flex items-center gap-2">
        <span
          className="block h-2.5 w-2.5 rounded-full bg-brand-teal"
          aria-hidden="true"
        />
        <span className="text-base font-semibold tracking-tight text-brand-text">
          Rally
        </span>
      </div>
    </main>
  );
}
