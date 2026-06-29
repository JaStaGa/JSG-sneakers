// /src/app/api/sneakers/search/route.ts

export const dynamic = "force-dynamic";

const KICKSDB_PRODUCTS_URL = "https://api.kicks.dev/v3/stockx/products";
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;

type CachedResponse = {
  timestamp: number;
  body: string;
  contentType: string;
};

type UpstreamResult = {
  status: number;
  body: string;
  contentType: string;
};

const cache = new Map<string, CachedResponse>();
const inflight = new Map<string, Promise<UpstreamResult>>();

function jsonResponse(
  body: unknown,
  status: number,
  headers?: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

function parsePositiveInteger(
  value: string | null,
  fallback: number,
  maximum: number,
) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, maximum);
}

function buildUpstreamParams(searchParams: URLSearchParams) {
  const query = searchParams.get("q")?.trim();
  const sku =
    searchParams.get("sku")?.trim() ||
    searchParams.get("styleId")?.trim();
  const filters = searchParams.get("filters")?.trim();

  if (!query && !sku && !filters) {
    return {
      error: "Provide at least one of: q, sku, or filters.",
      status: 400,
    } as const;
  }

  if (query && query.length < 3 && !sku && !filters) {
    return {
      error:
        "Text searches must contain at least 3 characters unless a SKU or filter is provided.",
      status: 400,
    } as const;
  }

  if (filters && filters.length > 1000) {
    return {
      error: "The filters value is too long.",
      status: 400,
    } as const;
  }

  const upstream = new URLSearchParams();

  /*
   * Preserve the existing behavior in which SKU takes priority over the
   * general text query. This prevents the current search page and product
   * pages from breaking while the rest of the data layer is upgraded.
   */
  const searchTerm = sku || query;

  if (searchTerm) {
    upstream.set("query", searchTerm);
  }

  if (filters) {
    upstream.set("filters", filters);
  }

  upstream.set(
    "page",
    String(parsePositiveInteger(searchParams.get("page"), 1, 1000)),
  );

  upstream.set(
    "limit",
    String(parsePositiveInteger(searchParams.get("limit"), 20, 100)),
  );

  const sort = searchParams.get("sort")?.trim();

  if (sort) {
    upstream.set("sort", sort);
  }

  const market = searchParams.get("market")?.trim();

  if (market) {
    upstream.set("market", market);
  }

  const currency = searchParams.get("currency")?.trim();

  if (currency) {
    upstream.set("currency", currency);
  }

  return { params: upstream } as const;
}

function createSuccessResponse(
  cached: CachedResponse,
  cacheStatus: "HIT" | "MISS" | "COALESCED",
) {
  return new Response(cached.body, {
    status: 200,
    headers: {
      "Content-Type": cached.contentType,
      "Cache-Control": "s-maxage=43200, stale-while-revalidate=43200",
      "X-Cache": cacheStatus,
    },
  });
}

export async function GET(request: Request) {
  const apiKey = process.env.KICKSDB_KEY;

  if (!apiKey) {
    return jsonResponse({ error: "Missing KICKSDB_KEY." }, 500);
  }

  const requestUrl = new URL(request.url);
  const built = buildUpstreamParams(requestUrl.searchParams);

  if ("error" in built) {
    return jsonResponse({ error: built.error }, built.status ?? 400);
  }

  const queryString = built.params.toString();
  const cacheKey = queryString;

  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return createSuccessResponse(cached, "HIT");
  }

  const existingRequest = inflight.get(cacheKey);

  if (existingRequest) {
    const result = await existingRequest;

    if (result.status !== 200) {
      return new Response(result.body, {
        status: result.status,
        headers: {
          "Content-Type": result.contentType,
          "Cache-Control": "no-store",
        },
      });
    }

    return createSuccessResponse(
      {
        timestamp: Date.now(),
        body: result.body,
        contentType: result.contentType,
      },
      "COALESCED",
    );
  }

  const upstreamUrl = `${KICKSDB_PRODUCTS_URL}?${queryString}`;

  const requestPromise = (async (): Promise<UpstreamResult> => {
    try {
      const response = await fetch(upstreamUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const body = await response.text();
      const contentType =
        response.headers.get("content-type") ?? "application/json";

      if (!response.ok) {
        return {
          status: response.status,
          body: JSON.stringify({
            error: "KicksDB request failed.",
            status: response.status,
            detail: body.slice(0, 2000),
          }),
          contentType: "application/json",
        };
      }

      return {
        status: 200,
        body,
        contentType,
      };
    } catch (error: unknown) {
      return {
        status: 502,
        body: JSON.stringify({
          error: "Unable to reach KicksDB.",
          detail: error instanceof Error ? error.message : String(error),
        }),
        contentType: "application/json",
      };
    }
  })();

  inflight.set(cacheKey, requestPromise);

  try {
    const result = await requestPromise;

    if (result.status !== 200) {
      return new Response(result.body, {
        status: result.status,
        headers: {
          "Content-Type": result.contentType,
          "Cache-Control": "no-store",
        },
      });
    }

    const newCacheEntry: CachedResponse = {
      timestamp: Date.now(),
      body: result.body,
      contentType: result.contentType,
    };

    cache.set(cacheKey, newCacheEntry);

    return createSuccessResponse(newCacheEntry, "MISS");
  } finally {
    inflight.delete(cacheKey);
  }
}