// /src/app/page.tsx
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import type { Sneaker } from "@/lib/sneakerApi";

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

// Brand seeds: more breadth, 10 per brand
const BRAND_SEEDS: { q: string; matchers: RegExp[] }[] = [
  { q: "Jordan", matchers: [/^jordan$/i, /^air jordan/i] },
  { q: "Nike", matchers: [/^nike$/i] },
  { q: "adidas", matchers: [/^adidas$/i] },
  { q: "New Balance", matchers: [/^new balance$/i, /^nb$/i] },
  { q: "ASICS", matchers: [/^asics$/i] },
  { q: "POP MART", matchers: [/^pop ?mart$/i] },
  { q: "Essentials", matchers: [/^essentials$/i, /fear of god/i] },
  { q: "Fear of God Essentials", matchers: [/fear of god/i, /essentials/i] },
];

function brandMatches(seed: { matchers: RegExp[] }, brand?: string) {
  const b = (brand ?? "").trim();
  return b && seed.matchers.some((rx) => rx.test(b));
}

function uniqKey(p: Sneaker) {
  return String(p.slug ?? p.sku ?? p.id ?? "").toLowerCase();
}

async function fetchBrandBatch(q: string, limit = 10): Promise<Sneaker[]> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  const url = await absoluteUrl(`/api/sneakers/search?${params.toString()}`);
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const json = await res.json();
  return (Array.isArray(json) ? json : json.data ?? []) as Sneaker[];
}

function buildContiguousFromOne(items: Sneaker[]) {
  const byRank = new Map<number, Sneaker>();
  for (const p of items) {
    const r = typeof p.rank === "number" ? p.rank : undefined;
    if (!r || r <= 0) continue;
    if (!byRank.has(r)) byRank.set(r, p);
  }
  const out: Sneaker[] = [];
  for (let want = 1; want <= 1000; want++) {
    const hit = byRank.get(want);
    if (!hit) break;
    out.push(hit);
  }
  return out;
}

async function getApproxTopContiguous(): Promise<Sneaker[]> {
  const batches = await Promise.all(
    BRAND_SEEDS.map((seed) => fetchBrandBatch(seed.q, 10))
  );

  const seen = new Set<string>();
  const merged: Sneaker[] = [];
  for (let i = 0; i < batches.length; i++) {
    const seed = BRAND_SEEDS[i];
    for (const p of batches[i]) {
      if (!brandMatches(seed, p.brand)) continue;
      if (typeof p.rank !== "number" || p.rank <= 0) continue;
      const k = uniqKey(p);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      merged.push(p);
    }
  }

  merged.sort(
    (a, b) =>
      (a.rank ?? Number.POSITIVE_INFINITY) -
      (b.rank ?? Number.POSITIVE_INFINITY)
  );

  const contiguous = buildContiguousFromOne(merged);
  if (contiguous.length >= 10) return contiguous;
  return merged.slice(0, 10);
}

// --- blurb helpers: use full description when available, trim to length ---
const MAX_BLURB = 160;
function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function ellipsize(s: string, n = MAX_BLURB) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const end = cut.lastIndexOf(" ");
  return (end > 60 ? cut.slice(0, end) : cut).trim() + "…";
}
function blurbFor(p: Sneaker) {
  const raw = p.description ?? p.short_description ?? "";
  const plain = stripHtml(raw);
  return ellipsize(plain, MAX_BLURB);
}

export default async function Page() {
  const top = await getApproxTopContiguous();

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

      {/* Top ranked across popular brands (approx) */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium text-yellow-400">
          Top ranked across popular brands (approx)
        </h2>

        <ul className="divide-y divide-neutral-800 rounded-2xl border border-neutral-800 bg-neutral-900">
          {top.length === 0 && (
            <li className="p-4 text-sm text-white/60">No items available.</li>
          )}

          {top.map((p) => {
            const href = `/sneaker/${encodeURIComponent(
              p.slug ?? p.sku ?? p.id
            )}`;
            const title = p.title ?? p.name ?? "Untitled";
            const blurb = blurbFor(p);
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
          Built from multiple brand searches (10 per brand). Shows rank&nbsp;#1
          upward until a gap; if fewer than 10 contiguous ranks found, falls
          back to best 10 by rank.
        </p>
      </div>
    </section>
  );
}
