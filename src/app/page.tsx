// /src/app/page.tsx

import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
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

  try {
    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await response.text();

      console.error(
        `Ranked product request failed with ${response.status}:`,
        errorBody,
      );

      return [];
    }

    const json = (await response.json()) as
      | SneakerSearchResponse
      | Sneaker[];

    const products = Array.isArray(json)
      ? json
      : json.data ?? [];

    return cleanRankedProducts(products);
  } catch (error: unknown) {
    console.error(
      "Unable to load ranked products:",
      error instanceof Error
        ? error.message
        : String(error),
    );

    return [];
  }
}

const MAX_BLURB_LENGTH = 160;

function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ellipsize(
  value: string,
  maximumLength = MAX_BLURB_LENGTH,
) {
  if (value.length <= maximumLength) {
    return value;
  }

  const shortened = value.slice(0, maximumLength);
  const finalSpace = shortened.lastIndexOf(" ");

  const ending =
    finalSpace > 60
      ? shortened.slice(0, finalSpace)
      : shortened;

  return `${ending.trim()}…`;
}

function blurbFor(product: Sneaker) {
  const description =
    product.description ??
    product.short_description ??
    "";

  return ellipsize(stripHtml(description));
}

function RankingRow({
  product,
}: {
  product: Sneaker;
}) {
  const identifier =
    product.slug ??
    product.sku ??
    product.id;

  const href = `/sneaker/${encodeURIComponent(
    identifier,
  )}`;

  const title =
    product.title ??
    product.name ??
    "Untitled product";

  const priceDetails: string[] = [];

  if (product.avg_price !== undefined) {
    priceDetails.push(
      `avg $${Math.round(product.avg_price)}`,
    );
  }

  if (product.max_price !== undefined) {
    priceDetails.push(
      `max $${Math.round(product.max_price)}`,
    );
  }

  const metadata = [
    product.brand,
    product.gender,
    ...priceDetails,
  ]
    .filter(Boolean)
    .join(" · ");

  const description = blurbFor(product);

  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-4 p-4 transition-colors hover:bg-neutral-800/60"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 text-xs font-medium text-white/50">
              #{product.rank ?? "—"}
            </span>

            <h3 className="truncate font-medium">
              {title}
            </h3>
          </div>

          {(description || metadata) && (
            <p className="mt-1 text-sm text-white/60">
              {description}

              {description && metadata ? " · " : ""}

              {metadata}
            </p>
          )}
        </div>

        {product.image && (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-neutral-700 bg-white">
            <Image
              src={product.image}
              alt={title}
              fill
              className="object-contain p-1"
              sizes="64px"
            />
          </div>
        )}
      </Link>
    </li>
  );
}

function RankingList({
  title,
  products,
  emptyMessage,
}: {
  title: string;
  products: Sneaker[];
  emptyMessage: string;
}) {
  return (
    <details className="rounded-2xl border border-neutral-800 bg-neutral-900">
      <summary className="cursor-pointer select-none p-4 text-lg font-medium text-yellow-400">
        {title}
      </summary>

      <ul className="divide-y divide-neutral-800">
        {products.length > 0 ? (
          products.map((product) => (
            <RankingRow
              key={uniqueProductKey(product)}
              product={product}
            />
          ))
        ) : (
          <li className="p-4 text-sm text-white/60">
            {emptyMessage}
          </li>
        )}
      </ul>
    </details>
  );
}

export default async function Page() {
  const [
    topAll,
    topSneakers,
    topStreetwear,
    topCollectibles,
  ] = await Promise.all([
    fetchRankedProducts("rank > 0"),
    fetchRankedProducts(
      "product_type = 'sneakers' AND rank > 0",
    ),
    fetchRankedProducts(
      "product_type = 'streetwear' AND rank > 0",
    ),
    fetchRankedProducts(
      "product_type = 'collectibles' AND rank > 0",
    ),
  ]);

  return (
    <section className="space-y-8">
      <h1 className="font-brand text-3xl text-yellow-400">
        JSG Drip
      </h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/search"
          className="block rounded-2xl border border-neutral-800 bg-neutral-900 p-6 transition-colors hover:border-yellow-400"
        >
          <h2 className="text-lg font-medium">
            Search products →
          </h2>

          <p className="text-sm text-white/70">
            Search sneakers, streetwear, and collectibles by
            name or SKU.
          </p>
        </Link>

        <Link
          href="/convert"
          className="block rounded-2xl border border-neutral-800 bg-neutral-900 p-6 transition-colors hover:border-yellow-400"
        >
          <h2 className="text-lg font-medium">
            Size converter →
          </h2>

          <p className="text-sm text-white/70">
            Convert between US and EU shoe sizes.
          </p>
        </Link>
      </div>

      <p className="text-sm text-white/60">
        <span className="font-medium text-white/80">
          Marketplace rank
        </span>{" "}
        is the popularity rank supplied by KicksDB&apos;s
        StockX product data. Lower numbers represent more
        popular products.
      </p>

      <div className="space-y-4">
        <RankingList
          title="Top 10 — All products"
          products={topAll}
          emptyMessage="No ranked products are currently available."
        />

        <RankingList
          title="Top 10 — Sneakers"
          products={topSneakers}
          emptyMessage="No ranked sneakers are currently available."
        />

        <RankingList
          title="Top 10 — Streetwear"
          products={topStreetwear}
          emptyMessage="No ranked streetwear products are currently available."
        />

        <RankingList
          title="Top 10 — Collectibles"
          products={topCollectibles}
          emptyMessage="No ranked collectibles are currently available."
        />

        <p className="text-xs text-white/50">
          Each list is loaded directly from KicksDB using its
          marketplace rank and product-type filters. Rankings
          may change as KicksDB refreshes its StockX data.
        </p>
      </div>
    </section>
  );
}