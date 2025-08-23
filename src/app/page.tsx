// /src/app/page.tsx
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import type { Sneaker } from "@/lib/sneakerApi";

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function summarize(s?: string, max = 160) {
  if (!s) return "";
  const t = s.trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

async function absoluteUrl(path: string) {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    process.env.VERCEL_URL ??
    "localhost:3000";
  return `${proto}://${host}${path}`;
}

async function getTop10(): Promise<Sneaker[]> {
  // Grab a broad set, then sort by rank locally.
  const params = new URLSearchParams({ q: "air", limit: "100" });
  const url = await absoluteUrl(`/api/sneakers/search?${params.toString()}`);
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const json = await res.json();
  const list: Sneaker[] = Array.isArray(json) ? json : json.data ?? [];

  // Sort by rank (ascending), de-dupe by slug/sku/id, take 10.
  const sorted = [...list].sort(
    (a, b) =>
      (a.rank ?? Number.POSITIVE_INFINITY) -
      (b.rank ?? Number.POSITIVE_INFINITY)
  );
  const seen = new Set<string>();
  const out: Sneaker[] = [];
  for (const p of sorted) {
    const key = (p.slug ?? p.sku ?? p.id ?? "").toString().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= 10) break;
  }
  return out;
}

export default async function Page() {
  const top10 = await getTop10();

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

      {/* Top 10 ranked */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium text-yellow-400">Top 10 right now</h2>

        <ul className="divide-y divide-neutral-800 rounded-2xl border border-neutral-800 bg-neutral-900">
          {top10.length === 0 && (
            <li className="p-4 text-sm text-white/60">No items available.</li>
          )}

          {top10.map((p) => {
            const href = `/sneaker/${encodeURIComponent(
              p.slug ?? p.sku ?? p.id
            )}`;
            const title = p.title ?? p.name ?? "Untitled";
            const rawBlurb =
              (p.short_description && p.short_description.trim()) ||
              (p.description ? stripHtml(p.description) : "");
            const blurb = summarize(rawBlurb, 160);

            const priceBits: string[] = [];
            if (p.avg_price !== undefined)
              priceBits.push(`avg $${Math.round(p.avg_price)}`);
            if (p.max_price !== undefined)
              priceBits.push(`max $${Math.round(p.max_price)}`);
            const meta = [p.gender, ...priceBits].filter(Boolean).join(" · ");

            return (
              <li key={p.id ?? href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 p-3 hover:bg-neutral-800/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-white/50">
                        #{p.rank ?? "—"}
                      </span>
                      <h3 className="truncate">{title}</h3>
                    </div>
                    {(blurb || meta) && (
                      <p className="text-sm text-white/60">
                        {blurb}
                        {blurb && meta ? " · " : ""}
                        {meta}
                      </p>
                    )}
                  </div>

                  {p.image && (
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-neutral-800">
                      <Image
                        src={p.image}
                        alt={title}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="text-xs text-white/50">
          “Top 10” is determined by the lowest popularity rank seen in a broad
          search and may vary as market data updates.
        </p>
      </div>
    </section>
  );
}
