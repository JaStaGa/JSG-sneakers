// /api/sneakers/search?q=air jordan 11 legend blue  OR  /api/sneakers/search?sku=CT8012-104
export const dynamic = "force-dynamic";

function buildQuery(params: URLSearchParams) {
    const q = params.get("q")?.trim();
    const sku = params.get("sku")?.trim() || params.get("styleId")?.trim();
    const term = sku || q;
    if (!term) return { error: "Provide ?q= or ?sku=", status: 400 as const };
    const out = new URLSearchParams();
    out.set("query", term);           // KicksDB StockX search uses `query=`
    out.set("limit", params.get("limit") ?? "20");
    return { params: out };
}

export async function GET(req: Request) {
    const key = process.env.KICKSDB_KEY;
    if (!key) return new Response(JSON.stringify({ error: "Missing KICKSDB_KEY" }), { status: 500 });

    const built = buildQuery(new URL(req.url).searchParams);
    if ("error" in built) return new Response(JSON.stringify({ error: built.error }), { status: built.status });

    const url = `https://api.kicks.dev/v3/stockx/products?${built.params.toString()}`;
    const r = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },  // required
        cache: "no-store",
    });

    if (!r.ok) {
        const text = await r.text();
        return new Response(JSON.stringify({ error: "Upstream error", status: r.status, detail: text }), { status: 502 });
    }
    const data = await r.json(); // KicksDB shape: { status, data, ... }
    return Response.json(data);
}
