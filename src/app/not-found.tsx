import Link from "next/link";

export default function NotFound() {
  return (
    <main
      className="relative flex flex-1 min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{ backgroundColor: "#E8DFD1" }}
    >
      <section className="flex flex-col items-center">
        <div
          aria-hidden="true"
          className="pointer-events-none select-none text-8xl sm:text-[132px] font-semibold leading-none"
          style={{ color: "rgba(90,74,58,0.15)" }}
        >
          404
        </div>

        <h1
          className="mt-3 text-2xl font-medium leading-tight"
          style={{ color: "#5A4A3A" }}
        >
          Nothing to see here.
        </h1>

        <Link href="/" className="mt-2 text-sm hover:underline text-brand-teal">
          Find something new
        </Link>
      </section>

      <div className="absolute bottom-8 flex items-center gap-2">
        <span
          className="block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: "#4A9B8E" }}
          aria-hidden="true"
        />
        <span
          className="text-base font-semibold tracking-tight"
          style={{ color: "#5A4A3A" }}
        >
          Rally
        </span>
      </div>
    </main>
  );
}
