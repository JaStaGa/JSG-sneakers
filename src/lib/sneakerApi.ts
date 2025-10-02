// /src/lib/sneakerApi.ts
export type Sneaker = {
    id: string;
    title: string;
    name?: string;
    brand?: string;
    model?: string;
    gender?: string;
    sku?: string;
    slug?: string;
    image?: string;
    gallery?: string[];
    gallery_360?: string[];
    description?: string;
    short_description?: string;
    category?: string;
    secondary_category?: string;
    product_type?: string;
    categories?: string[];
    link?: string;
    min_price?: number;
    max_price?: number;
    avg_price?: number;
    weekly_orders?: number;
    rank?: number;
    upcoming?: boolean;
    created_at?: string;
    updated_at?: string;
    traits?: Record<string, unknown> | null;
    variants?: unknown[] | null;
    statistics?: Record<string, unknown> | null;
    goat?: unknown | null;
    kickscrew?: unknown | null;
    stadium_goods?: unknown | null;
};

// ---- client-side memo cache to avoid duplicate upstream calls during a session
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12h
const cache = new Map<string, { ts: number; data: Sneaker[] }>();
const inflight = new Map<string, Promise<Sneaker[]>>();

function keyFrom(q: { q?: string; sku?: string; limit?: number }) {
    const p = new URLSearchParams();
    if (q.q) p.set("q", q.q.trim());
    if (q.sku) p.set("sku", q.sku.trim());
    p.set("limit", String(q.limit ?? 20));
    return p.toString();
}

export async function searchSneakers(q: {
    q?: string;
    sku?: string;
    limit?: number;
}): Promise<Sneaker[]> {
    const qs = keyFrom(q);

    // fresh cache hit
    const hit = cache.get(qs);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.data;

    // de-dupe concurrent identical requests
    const pending = inflight.get(qs);
    if (pending) return pending;

    const p = new URLSearchParams(qs);
    const req = fetch(`/api/sneakers/search?${p.toString()}`, { cache: "no-store" })
        .then(async (res) => {
            if (!res.ok) throw new Error(`Search failed: ${res.status}`);
            const json = await res.json();
            const list: unknown = Array.isArray(json) ? json : json?.data ?? [];
            const data = list as Sneaker[];
            cache.set(qs, { ts: Date.now(), data });
            return data;
        })
        .finally(() => {
            inflight.delete(qs);
        });

    inflight.set(qs, req);
    return req;
}
