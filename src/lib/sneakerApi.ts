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

export type SneakerSearchMeta = {
  current_page?: number;
  per_page?: number;
  total?: number;
  facets?: unknown;
  [key: string]: unknown;
};

export type SneakerSearchResponse = {
  data: Sneaker[];
  meta?: SneakerSearchMeta;
};

export type SneakerSearchParams = {
  q?: string;
  sku?: string;
  filters?: string;
  sort?: string;
  page?: number;
  limit?: number;
  market?: string;
  currency?: string;
};

const CACHE_TTL_MS = 1000 * 60 * 60 * 12;

const cache = new Map<
  string,
  {
    timestamp: number;
    result: SneakerSearchResponse;
  }
>();

const inflight = new Map<string, Promise<SneakerSearchResponse>>();

function keyFrom(params: SneakerSearchParams) {
  const searchParams = new URLSearchParams();

  if (params.q?.trim()) {
    searchParams.set("q", params.q.trim());
  }

  if (params.sku?.trim()) {
    searchParams.set("sku", params.sku.trim());
  }

  if (params.filters?.trim()) {
    searchParams.set("filters", params.filters.trim());
  }

  if (params.sort?.trim()) {
    searchParams.set("sort", params.sort.trim());
  }

  if (params.page !== undefined) {
    searchParams.set("page", String(params.page));
  }

  if (params.market?.trim()) {
    searchParams.set("market", params.market.trim());
  }

  if (params.currency?.trim()) {
    searchParams.set("currency", params.currency.trim());
  }

  searchParams.set("limit", String(params.limit ?? 20));

  return searchParams.toString();
}

function normalizeResponse(json: unknown): SneakerSearchResponse {
  if (Array.isArray(json)) {
    return {
      data: json as Sneaker[],
    };
  }

  if (typeof json !== "object" || json === null) {
    return {
      data: [],
    };
  }

  const response = json as {
    data?: unknown;
    meta?: unknown;
  };

  return {
    data: Array.isArray(response.data)
      ? (response.data as Sneaker[])
      : [],
    meta:
      typeof response.meta === "object" && response.meta !== null
        ? (response.meta as SneakerSearchMeta)
        : undefined,
  };
}

export async function searchSneakersPage(
  params: SneakerSearchParams,
): Promise<SneakerSearchResponse> {
  const queryString = keyFrom(params);

  const cached = cache.get(queryString);

  if (
    cached &&
    Date.now() - cached.timestamp < CACHE_TTL_MS
  ) {
    return cached.result;
  }

  const pending = inflight.get(queryString);

  if (pending) {
    return pending;
  }

  const request = fetch(
    `/api/sneakers/search?${queryString}`,
    {
      cache: "no-store",
    },
  )
    .then(async (response) => {
      const json: unknown = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        let message = `Search failed: ${response.status}`;

        if (
          typeof json === "object" &&
          json !== null &&
          "error" in json
        ) {
          const error = (json as { error?: unknown }).error;

          if (typeof error === "string") {
            message = error;
          }
        }

        throw new Error(message);
      }

      const result = normalizeResponse(json);

      cache.set(queryString, {
        timestamp: Date.now(),
        result,
      });

      return result;
    })
    .finally(() => {
      inflight.delete(queryString);
    });

  inflight.set(queryString, request);

  return request;
}

export async function searchSneakers(
  params: SneakerSearchParams,
): Promise<Sneaker[]> {
  const result = await searchSneakersPage(params);
  return result.data;
}