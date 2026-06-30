// /src/app/page.tsx

import Link from "next/link";
import { headers } from "next/headers";
import MarketplaceRankings from "@/components/MarketplaceRankings";
import type {
  Sneaker,
  SneakerSearchResponse,
} from "@/lib/sneakerApi";

async function absoluteUrl(path: string) {
  const requestHeaders = await headers();

  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? "http";

  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    process.env.VERCEL_URL ??
    "localhost:3000";

  return `${protocol}://${host}${path}`;
}

function uniqueProductKey(product: Sneaker) {
  return String(
    product.slug ??
    product.sku ??
    product.id ??
    "",
  ).toLowerCase();
}

function cleanRankedProducts(products: Sneaker[]) {
  const seen = new Set<string>();

  return products
    .filter(
      (product) =>
        typeof product.rank === "number" &&
        product.rank > 0,
    )
    .sort(
      (first, second) =>
        (first.rank ?? Number.POSITIVE_INFINITY) -
        (second.rank ?? Number.POSITIVE_INFINITY),
    )
    .filter((product) => {
      const key = uniqueProductKey(product);

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

const RANKED_REQUEST_ATTEMPTS = 2;
const RANKED_RETRY_DELAY_MS = 500;

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function fetchRankedProducts(
  filters: string,
): Promise<Sneaker[]> {
  const params = new URLSearchParams({
    filters,
    sort: "rank",
    limit: "20",
  });

  const url = await absoluteUrl(
    `/api/sneakers/search?${params.toString()}`,
  );

  for (
    let attempt = 1;
    attempt <= RANKED_REQUEST_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
      });

      if (response.ok) {
        const json = (await response.json()) as
          | SneakerSearchResponse
          | Sneaker[];

        const products = Array.isArray(json)
          ? json
          : json.data ?? [];

        return cleanRankedProducts(products);
      }

      const canRetry =
        response.status === 429 ||
        response.status >= 500;

      const isFinalAttempt =
        attempt === RANKED_REQUEST_ATTEMPTS;

      if (!canRetry || isFinalAttempt) {
        return [];
      }
    } catch {
      const isFinalAttempt =
        attempt === RANKED_REQUEST_ATTEMPTS;

      if (isFinalAttempt) {
        return [];
      }
    }

    await wait(RANKED_RETRY_DELAY_MS * attempt);
  }

  return [];
}

export default async function Page() {
  const topAll = await fetchRankedProducts(
    "rank >= 1 AND rank <= 10",
  );

  const topSneakers = await fetchRankedProducts(
    "categories IN ['sneakers'] AND rank > 0",
  );

  const topStreetwear = await fetchRankedProducts(
    "categories IN ['streetwear'] AND rank > 0",
  );

  const topCollectibles = await fetchRankedProducts(
    "categories IN ['collectibles'] AND rank > 0",
  );

  return (
    <div className="space-y-16 sm:space-y-20">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:items-end">
        <div>
          <p className="eyebrow">
            Marketplace discovery
          </p>

          <h1 className="page-heading mt-4 max-w-4xl">
            Find what&apos;s moving in sneakers,
            streetwear, and collectibles.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/60 sm:text-lg sm:leading-8">
            Search marketplace products, browse current
            popularity rankings, and compare shoe sizes
            through one focused platform.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/search"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-yellow-400 px-6 text-sm font-bold text-black transition hover:bg-yellow-300"
            >
              Search marketplace
            </Link>

            <Link
              href="/convert"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.035] px-6 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/[0.07]"
            >
              Open size guide
            </Link>
          </div>
        </div>

        <aside className="surface-card p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-yellow-400">
            Explore JSG Drip
          </p>

          <div className="mt-5 divide-y divide-white/10">
            <div className="flex gap-4 pb-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-400 text-sm font-bold text-black">
                01
              </span>

              <div>
                <h2 className="font-semibold">
                  Search products
                </h2>

                <p className="mt-1 text-sm leading-6 text-white/50">
                  Find products by name, brand, or SKU.
                </p>
              </div>
            </div>

            <div className="flex gap-4 py-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-sm font-bold text-yellow-400">
                02
              </span>

              <div>
                <h2 className="font-semibold">
                  Browse rankings
                </h2>

                <p className="mt-1 text-sm leading-6 text-white/50">
                  Compare popular marketplace products
                  across four categories.
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] text-sm font-bold text-yellow-400">
                03
              </span>

              <div>
                <h2 className="font-semibold">
                  Convert sizes
                </h2>

                <p className="mt-1 text-sm leading-6 text-white/50">
                  Compare approximate US and EU shoe sizes.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section>
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">
              Marketplace rankings
            </p>

            <h2 className="section-heading mt-3">
              See what shoppers are watching.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">
              Rankings use the marketplace popularity
              position supplied through KicksDB&apos;s
              StockX product data. Lower rank numbers
              represent more popular products.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-xs font-medium text-white/55">
            <span className="h-2 w-2 rounded-full bg-yellow-400" />
            Marketplace data via KicksDB
          </div>
        </div>

        <MarketplaceRankings
          all={topAll}
          sneakers={topSneakers}
          streetwear={topStreetwear}
          collectibles={topCollectibles}
        />

        <p className="mt-6 text-xs leading-5 text-white/40">
          Rankings, prices, and product availability may
          change as the upstream marketplace data is
          refreshed.
        </p>
      </section>
    </div>
  );
}