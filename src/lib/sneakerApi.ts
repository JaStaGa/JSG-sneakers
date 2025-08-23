// /src/lib/sneakerApi.ts
export type Sneaker = {
    id: string;
    // KicksDB uses `title`; keep `name` optional for future sources
    title: string;
    name?: string;

    brand?: string;
    model?: string;
    gender?: string;                 // "men" | "women" | "kids" | "unisex" | etc.
    sku?: string;                    // CT8012-104
    slug?: string;

    image?: string;
    gallery?: string[];
    gallery_360?: string[];

    description?: string;            // may contain <br> tags / HTML
    short_description?: string;

    category?: string;
    secondary_category?: string;
    product_type?: string;
    categories?: string[];

    link?: string;                   // outbound StockX URL

    // pricing/meta (when present)
    min_price?: number;
    max_price?: number;
    avg_price?: number;
    weekly_orders?: number;
    rank?: number;
    upcoming?: boolean;

    // timestamps
    created_at?: string;
    updated_at?: string;

    // vendor-specific (often null)
    traits?: Record<string, unknown> | null;
    variants?: unknown[] | null;
    statistics?: Record<string, unknown> | null;
    goat?: unknown | null;
    kickscrew?: unknown | null;
    stadium_goods?: unknown | null;
};

export async function searchSneakers(q: { q?: string; sku?: string; limit?: number }): Promise<Sneaker[]> {
    const p = new URLSearchParams();
    if (q.q) p.set("q", q.q);
    if (q.sku) p.set("sku", q.sku);
    if (q.limit) p.set("limit", String(q.limit));

    const res = await fetch(`/api/sneakers/search?${p.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);

    const json = await res.json();
    const list: unknown = Array.isArray(json) ? json : json?.data ?? [];
    // Trust the upstream keys and cast to our superset type.
    return list as Sneaker[];
}
