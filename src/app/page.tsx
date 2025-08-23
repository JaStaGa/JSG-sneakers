import Link from "next/link";

export default function Page() {
  return (
    <section className="space-y-8">
      <h1 className="font-brand text-3xl text-yellow-400">JSG Drip</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/search"
          className="block rounded-2xl border border-neutral-800 bg-neutral-900 p-6 hover:border-yellow-400"
        >
          <h2 className="text-lg font-medium">Search sneakers →</h2>
          <p className="text-sm text-white/70">Find by name or SKU.</p>
        </Link>

        <Link
          href="/convert"
          className="block rounded-2xl border border-neutral-800 bg-neutral-900 p-6 hover:border-yellow-400"
        >
          <h2 className="text-lg font-medium">Size converter →</h2>
          <p className="text-sm text-white/70">US ↔ EU, Men/Women/GS.</p>
        </Link>
      </div>
    </section>
  );
}
