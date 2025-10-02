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

/** ---------- Brand seeds (breadth) ---------- */
const BRAND_SEEDS: { q: string; matchers: RegExp[] }[] = [
  { q: "Jordan", matchers: [/^jordan$/i, /^air jordan/i] },
  { q: "Nike", matchers: [/^nike$/i] },
  { q: "adidas", matchers: [/^adidas$/i] },
  { q: "New Balance", matchers: [/^new balance$/i, /^nb$/i] },
  { q: "ASICS", matchers: [/^asics$/i] },
  { q: "Yeezy", matchers: [/^yeezy$/i] },
  { q: "Puma", matchers: [/^puma$/i] },
  { q: "Reebok", matchers: [/^reebok$/i] },
  { q: "Converse", matchers: [/^converse$/i] },
  { q: "Vans", matchers: [/^vans$/i] },
  { q: "Salomon", matchers: [/^salomon$/i] },
  { q: "Hoka", matchers: [/^hoka( one one)?$/i] },
  { q: "On Running", matchers: [/^on( running)?$/i] },
  { q: "UGG", matchers: [/^ugg$/i] },
  { q: "Crocs", matchers: [/^crocs/i] },
  { q: "Birkenstock", matchers: [/^birkenstock$/i] },
  { q: "Timberland", matchers: [/^timberland$/i] },


  // Streetwear / collectibles
  { q: "Supreme", matchers: [/^supreme$/i] },
  { q: "Essentials", matchers: [/^essentials$/i, /fear of god/i] },
  { q: "Fear of God Essentials", matchers: [/fear of god/i, /essentials/i] },
  { q: "Palace", matchers: [/^palace$/i] },
  { q: "BAPE", matchers: [/^bape$/i, /a bathing ape/i] },
  { q: "Kith", matchers: [/^kith$/i] },
  { q: "Stussy", matchers: [/^st[üu]ssy$/i, /^stussy$/i] },

  { q: "POP MART", matchers: [/^pop ?mart$/i] },
  { q: "BEARBRICK", matchers: [/^be@?rbrick$/i, /^medicom( toy)?$/i] },
  { q: "LEGO", matchers: [/^lego$/i] },
  { q: "Funko", matchers: [/^funko$/i] },
  { q: "KAWS", matchers: [/^kaws$/i] },
  { q: "Hot Wheels", matchers: [/^hot wheels$/i] },
  { q: "Pokémon", matchers: [/^pok[eé]mon/i] },
  { q: "Panini", matchers: [/^panini$/i] },
  { q: "Topps", matchers: [/^topps$/i] },
];

function brandMatches(seed: { matchers: RegExp[] }, brand?: string) {
  const b = (brand ?? "").trim();
  return b && seed.matchers.some((rx) => rx.test(b));
}
const uniqKey = (p: Sneaker) => String(p.slug ?? p.sku ?? p.id ?? "").toLowerCase();

async function fetchBrandBatch(q: string, limit = 10): Promise<Sneaker[]> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  const url = await absoluteUrl(`/api/sneakers/search?${params.toString()}`);
  const res = await fetch(url, { cache: "no-store" }); // was: next:{ revalidate:3600 }
  if (!res.ok) return [];
  const json = await res.json();
  return (Array.isArray(json) ? json : json.data ?? []) as Sneaker[];
}

/** ---------- Merge once; sort by rank ---------- */
async function getMergedRanked(): Promise<Sneaker[]> {
  const batches = await Promise.all(BRAND_SEEDS.map((s) => fetchBrandBatch(s.q, 10)));

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
  return merged;
}

/** ---------- Kind detection (loose heuristics) ---------- */
function kindOf(p: Sneaker): "sneakers" | "streetwear" | "collectibles" | "other" {
  const hay = `${p.product_type ?? ""} ${p.category ?? ""} ${p.secondary_category ?? ""} ${p.brand ?? ""}`.toLowerCase();

  if (/(sneaker|shoe|footwear)/.test(hay)) return "sneakers";
  if (/(streetwear|hoodie|t-?shirt|tee|sweatshirt|jacket|pants|shorts)/.test(hay) || /essentials/.test(hay))
    return "streetwear";
  if (/(collectible|figure|vinyl|toy|bearbrick|be@?rbrick|trading|card)/.test(hay) || /pop ?mart/.test(hay))
    return "collectibles";
  return "other";
}

/** ---------- “Contiguous from #1” helper ---------- */
function contiguousFromOne(items: Sneaker[]) {
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

/** Build a Top 10 list from a merged set, optionally filtering by kind */
function top10FromMerged(merged: Sneaker[], filter?: (p: Sneaker) => boolean) {
  const pool = filter ? merged.filter(filter) : merged;
  const contig = contiguousFromOne(pool);
  const base = (contig.length >= 10 ? contig : pool).slice(0, 10);
  return base;
}

/** ---------- Blurb helpers (use full description, trimmed) ---------- */
const MAX_BLURB = 160;
const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
function ellipsize(s: string, n = MAX_BLURB) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const end = cut.lastIndexOf(" ");
  return (end > 60 ? cut.slice(0, end) : cut).trim() + "…";
}
const blurbFor = (p: Sneaker) => ellipsize(stripHtml(p.description ?? p.short_description ?? ""));

/** ---------- List row ---------- */
function Row({ p }: { p: Sneaker }) {
  const href = `/sneaker/${encodeURIComponent(p.slug ?? p.sku ?? p.id)}`;
  const title = p.title ?? p.name ?? "Untitled";
  const priceBits: string[] = [];
  if (p.avg_price !== undefined) priceBits.push(`avg $${Math.round(p.avg_price)}`);
  if (p.max_price !== undefined) priceBits.push(`max $${Math.round(p.max_price)}`);
  const meta = [p.gender, ...priceBits].filter(Boolean).join(" · ");

  return (
    <li key={p.id ?? href}>
      <Link href={href} className="flex items-center gap-3 p-3 hover:bg-neutral-800/60">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-white/50">#{p.rank ?? "—"}</span>
            <h3 className="truncate">{title}</h3>
          </div>
          {(p.description || p.short_description || meta) && (
            <p className="text-sm text-white/60">
              {blurbFor(p)}
              {meta ? ` · ${meta}` : ""}
            </p>
          )}
        </div>
        {p.image && (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-neutral-800">
            <Image src={p.image} alt={title} fill className="object-cover" sizes="64px" />
          </div>
        )}
      </Link>
    </li>
  );
}

/** ---------- Page ---------- */
export default async function Page() {
  const merged = await getMergedRanked();
  const topAll = top10FromMerged(merged);
  const topSneakers = top10FromMerged(merged, (p) => kindOf(p) === "sneakers");
  const topStreetwear = top10FromMerged(merged, (p) => kindOf(p) === "streetwear");
  const topCollectibles = top10FromMerged(merged, (p) => kindOf(p) === "collectibles");
  const contigAll = contiguousFromOne(merged);               // #1 → until the first gap
  const lastRank = contigAll.at(-1)?.rank as number | undefined;

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

      {/* What is "ranking"? */}
      <p className="text-sm text-white/60">
        <span className="font-medium text-white/70">Ranking</span> is a marketplace popularity score (lower is more popular),
        derived from recent demand signals such as sales velocity, active bids/asks, and views.
        It updates frequently and the lists below are an approximation built from multiple brand searches.
      </p>

      {/* Top 10 dropdowns */}
      <div className="space-y-4">
        {/* All items */}
        <details className="rounded-2xl border border-neutral-800 bg-neutral-900">
          <summary className="cursor-pointer select-none p-3 text-lg font-medium text-yellow-400">
            Top 10 — All items
          </summary>
          <ul className="divide-y divide-neutral-800">
            {topAll.length ? topAll.map((p) => <Row key={uniqKey(p)} p={p} />) : (
              <li className="p-4 text-sm text-white/60">No items available.</li>
            )}
          </ul>
        </details>

        {/* Sneakers only */}
        <details className="rounded-2xl border border-neutral-800 bg-neutral-900">
          <summary className="cursor-pointer select-none p-3 text-lg font-medium text-yellow-400">
            Top 10 — Sneakers
          </summary>
          <ul className="divide-y divide-neutral-800">
            {topSneakers.length ? topSneakers.map((p) => <Row key={uniqKey(p)} p={p} />) : (
              <li className="p-4 text-sm text-white/60">No sneakers available.</li>
            )}
          </ul>
        </details>

        {/* Streetwear */}
        <details className="rounded-2xl border border-neutral-800 bg-neutral-900">
          <summary className="cursor-pointer select-none p-3 text-lg font-medium text-yellow-400">
            Top 10 — Streetwear
          </summary>
          <ul className="divide-y divide-neutral-800">
            {topStreetwear.length ? topStreetwear.map((p) => <Row key={uniqKey(p)} p={p} />) : (
              <li className="p-4 text-sm text-white/60">No streetwear available.</li>
            )}
          </ul>
        </details>

        {/* Collectibles */}
        <details className="rounded-2xl border border-neutral-800 bg-neutral-900">
          <summary className="cursor-pointer select-none p-3 text-lg font-medium text-yellow-400">
            Top 10 — Collectibles
          </summary>
          <ul className="divide-y divide-neutral-800">
            {topCollectibles.length ? topCollectibles.map((p) => <Row key={uniqKey(p)} p={p} />) : (
              <li className="p-4 text-sm text-white/60">No collectibles available.</li>
            )}
          </ul>
        </details>

        <p className="text-xs text-white/50">
          Built from multiple brand searches (10 per brand). Lists show ranks from #1 upward until a gap; if fewer than 10
          contiguous ranks are found, they fall back to the best by rank.
        </p>

        {/* Temporary: full contiguous list from #1 (to find the next missing rank) */}
        {/* <details className="rounded-2xl border border-neutral-800 bg-neutral-900">
          <summary className="cursor-pointer select-none p-3 text-lg font-medium text-yellow-400">
            Contiguous ranks from #1 — Temporary (debug)
          </summary>
          <div className="px-3 pb-3 text-sm text-white/60">
            {contigAll.length ? (
              <>
                Found <span className="text-white/80 font-medium">{contigAll.length}</span> contiguous ranks
                {lastRank ? <> (#{1}–#{lastRank})</> : null}.{" "}
                {lastRank ? <>Next missing appears to be <span className="text-white/80 font-medium">#{lastRank + 1}</span>.</> : null}
                <br />
                Tip: search more brands on localhost and add any that surface the missing rank to <code>BRAND_SEEDS</code>.
              </>
            ) : (
              <>No contiguous ranks found yet.</>
            )}
          </div>
          <ul className="divide-y divide-neutral-800">
            {contigAll.length
              ? contigAll.map((p) => <Row key={uniqKey(p)} p={p} />)
              : <li className="p-4 text-sm text-white/60">Nothing to show.</li>}
          </ul>
        </details> */}

      </div>
    </section>
  );
}
