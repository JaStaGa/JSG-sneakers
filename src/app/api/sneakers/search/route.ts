// /src/app/api/sneakers/search/route.ts
export const dynamic = "force-dynamic";

// --- simple in-function caches (persist per lambda instance)
const TTL_MS = 1000 * 60 * 60 * 12; // 12h
const cache = new Map<string, { ts: number; body: string }>();
const inflight = new Map<string, Promise<Response>>();

function buildQuery(params: URLSearchParams) {
    const q = params.get("q")?.trim();
    const sku = params.get("sku")?.trim() || params.get("styleId")?.trim();
    const term = sku || q;
    if (!term) return { error: "Provide ?q= or ?sku=", status: 400 as const };
    // Guard: avoid burning calls on tiny queries unless SKU
    if (!sku && q && q.length < 3) {
        return { error: "Query too short; use ≥3 chars or provide ?sku=", status: 400 as const };
    }
    const out = new URLSearchParams();
    out.set("query", term); // KicksDB StockX search uses `query=`
    const limit = Math.min(Number(params.get("limit") ?? "20"), 30);
    out.set("limit", String(limit));
    return { params: out };
}

function cacheKey(url: string) {
    return new URL(url).searchParams.toString(); // key by normalized QS
}

export async function GET(req: Request) {
    const key = process.env.KICKSDB_KEY;
    if (!key) {
        return new Response(JSON.stringify({ error: "Missing KICKSDB_KEY" }), { status: 500 });
    }

    const built = buildQuery(new URL(req.url).searchParams);
    if ("error" in built) {
        return new Response(JSON.stringify({ error: built.error }), { status: built.status });
    }

    const qs = built.params.toString();
    const ck = qs;

    // Fresh cache hit
    const hit = cache.get(ck);
    if (hit && Date.now() - hit.ts < TTL_MS) {
        return new Response(hit.body, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "s-maxage=43200, stale-while-revalidate=43200", // 12h CDN, 12h SWR
                "X-Cache": "HIT",
            },
        });
    }

    // De-dupe identical concurrent requests
    const pending = inflight.get(ck);
    if (pending) return pending;

    const url = `https://api.kicks.dev/v3/stockx/products?${qs}`;

    const reqPromise = (async () => {
        const r = await fetch(url, {
            headers: { Authorization: `Bearer ${key}` },
            // Allow Next to cache at fetch layer for ISR revalidation windows (defense in depth)
            next: { revalidate: 60 * 60 * 12 },
            cache: "no-store", // we control via Response headers + Next revalidate above
        });

        if (!r.ok) {
            const text = await r.text();
            // Bubble upstream status for visibility; avoid masking as 502
            return new Response(JSON.stringify({ error: "Upstream error", status: r.status, detail: text }), {
                status: r.status,
                headers: { "Content-Type": "application/json" },
            });
        }

        const data = await r.json(); // { status, data, ... } or [] depending on endpoint
        const body = JSON.stringify(data);
        cache.set(ck, { ts: Date.now(), body });

        return new Response(body, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "s-maxage=43200, stale-while-revalidate=43200",
                "X-Cache": "MISS",
            },
        });
    })()
        .finally(() => {
            inflight.delete(ck);
        });

    inflight.set(ck, reqPromise);
    return reqPromise;
}
