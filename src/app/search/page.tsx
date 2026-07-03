// /src/app/search/page.tsx

"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  searchSneakersPage,
  type Sneaker,
} from "@/lib/sneakerApi";

type GenderFilter =
  | "all"
  | "men"
  | "women"
  | "kids"
  | "unisex";

type ProductKind =
  | "all"
  | "sneakers"
  | "streetwear"
  | "collectibles";

type SortKey =
  | "rank"
  | "avg_price"
  | "avg_price_asc"
  | "updated_at";

const BRAND_OPTIONS = [
  { label: "Any brand", value: "all" },
  { label: "Jordan", value: "Jordan" },
  { label: "Nike", value: "Nike" },
  { label: "adidas", value: "adidas" },
  { label: "Yeezy", value: "Yeezy" },
  {
    label: "New Balance",
    value: "New Balance",
  },
  { label: "ASICS", value: "ASICS" },
  { label: "Puma", value: "Puma" },
  { label: "Reebok", value: "Reebok" },
  { label: "Converse", value: "Converse" },
  { label: "Vans", value: "Vans" },
  { label: "Salomon", value: "Salomon" },
  { label: "Hoka", value: "Hoka" },
  { label: "On Running", value: "On Running" },
  { label: "UGG", value: "UGG" },
  { label: "Crocs", value: "Crocs" },
  {
    label: "Birkenstock",
    value: "Birkenstock",
  },
  {
    label: "Timberland",
    value: "Timberland",
  },
  {
    label: "Maison Mihara Yasuhiro",
    value: "Maison Mihara Yasuhiro",
  },
  { label: "Supreme", value: "Supreme" },
  { label: "Essentials", value: "Essentials" },
  {
    label: "Fear of God Essentials",
    value: "Fear of God Essentials",
  },
  { label: "Palace", value: "Palace" },
  { label: "BAPE", value: "BAPE" },
  { label: "Kith", value: "Kith" },
  { label: "Stüssy", value: "Stussy" },
  { label: "POP MART", value: "POP MART" },
  { label: "BE@RBRICK", value: "BEARBRICK" },
  { label: "LEGO", value: "LEGO" },
  { label: "Funko", value: "Funko" },
  { label: "KAWS", value: "KAWS" },
  {
    label: "Hot Wheels",
    value: "Hot Wheels",
  },
  { label: "Pokémon", value: "Pokémon" },
  { label: "Panini", value: "Panini" },
  { label: "Topps", value: "Topps" },
];

function escapeFilterValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function buildApiFilters({
  brand,
  productKind,
  rankMax,
}: {
  brand: string;
  productKind: ProductKind;
  rankMax: string;
}) {
  const filters: string[] = [];

  if (brand !== "all") {
    filters.push(
      `brand = '${escapeFilterValue(brand)}'`,
    );
  }

  if (productKind !== "all") {
    filters.push(
      `categories IN ['${productKind}']`,
    );
  }

  const parsedRank = Number(rankMax);

  if (
    rankMax.trim() &&
    Number.isInteger(parsedRank) &&
    parsedRank > 0
  ) {
    filters.push(`rank <= ${parsedRank}`);
  }

  return filters.length
    ? filters.join(" AND ")
    : undefined;
}

function formatPrice(value?: number) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function productPrice(product: Sneaker) {
  return (
    product.avg_price ??
    product.min_price ??
    product.max_price
  );
}

function productImage(product: Sneaker) {
  return (
    product.image ??
    product.gallery?.find(Boolean) ??
    product.gallery_360?.find(Boolean) ??
    null
  );
}

function productTitle(product: Sneaker) {
  return (
    product.title ??
    product.name ??
    "Untitled product"
  );
}

function productHref(product: Sneaker) {
  const identifier =
    product.slug ??
    product.sku ??
    product.id;

  return `/sneaker/${encodeURIComponent(identifier)}`;
}

function genderMatches(
  product: Sneaker,
  filter: GenderFilter,
) {
  if (filter === "all") {
    return true;
  }

  const gender = (product.gender ?? "").toLowerCase();

  if (!gender) {
    return true;
  }

  if (filter === "kids") {
    return (
      gender.includes("kids") ||
      gender.includes("gs") ||
      gender.includes("grade school")
    );
  }

  if (filter === "men") {
    return (
      gender === "men" ||
      gender === "mens" ||
      gender === "male"
    );
  }

  if (filter === "women") {
    return (
      gender === "women" ||
      gender === "womens" ||
      gender === "female"
    );
  }

  return gender.includes("unisex");
}

function kindMatches(
  product: Sneaker,
  filter: ProductKind,
) {
  if (filter === "all") {
    return true;
  }

  const productType =
    product.product_type?.toLowerCase();

  const categories =
    product.categories?.map((category) =>
      category.toLowerCase(),
    ) ?? [];

  return (
    productType === filter ||
    categories.includes(filter)
  );
}

function FieldLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <label className="text-xs font-bold uppercase tracking-[0.12em] text-white/45">
      {children}
    </label>
  );
}

function ProductCard({
  product,
}: {
  product: Sneaker;
}) {
  const title = productTitle(product);
  const image = productImage(product);
  const price = formatPrice(productPrice(product));

  return (
    <li className="surface-card group overflow-hidden transition duration-200 hover:-translate-y-1 hover:border-yellow-400/35">
      <Link href={productHref(product)} className="block">
        <div className="relative aspect-[4/3] bg-[#f3f3ef]">
          {image ? (
            <Image
              src={image}
              alt={title}
              fill
              className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.04]"
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-xs font-bold uppercase tracking-[0.14em] text-black/45">
              Image unavailable
            </div>
          )}

          {product.rank !== undefined && (
            <span className="absolute left-3 top-3 rounded-full bg-black px-3 py-1.5 text-xs font-bold text-yellow-400 shadow-lg">
              Rank #{product.rank}
            </span>
          )}
        </div>

        <div className="space-y-3 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-yellow-400">
              {product.brand ?? "Marketplace product"}
            </p>

            <h2 className="mt-2 line-clamp-2 min-h-[2.75rem] font-semibold leading-snug text-white">
              {title}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-white/35">
                Average price
              </p>

              <p className="mt-1 font-semibold text-white">
                {price ?? "N/A"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-white/35">
                SKU
              </p>

              <p className="mt-1 truncate font-semibold text-white">
                {product.sku ?? "—"}
              </p>
            </div>
          </div>

          <p className="truncate text-sm text-white/45">
            {[product.category, product.gender]
              .filter(Boolean)
              .join(" · ") || "Product details"}
          </p>
        </div>
      </Link>
    </li>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="surface-card overflow-hidden"
        >
          <div className="aspect-[4/3] animate-pulse bg-white/10" />
          <div className="space-y-3 p-5">
            <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
            <div className="h-5 w-full animate-pulse rounded bg-white/10" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-white/10" />
            <div className="h-px bg-white/10" />
            <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [sku, setSku] = useState("");
  const [brand, setBrand] = useState("all");
  const [productKind, setProductKind] =
    useState<ProductKind>("all");
  const [gender, setGender] =
    useState<GenderFilter>("all");
  const [minP, setMinP] = useState("");
  const [maxP, setMaxP] = useState("");
  const [rankMax, setRankMax] = useState("");
  const [sortBy, setSortBy] =
    useState<SortKey>("rank");

  const [loading, setLoading] = useState(false);
  const [err, setErr] =
    useState<string | null>(null);
  const [items, setItems] = useState<Sneaker[]>([]);
  const [total, setTotal] =
    useState<number | null>(null);
  const [hasSearched, setHasSearched] =
    useState(false);

  const apiFilters = useMemo(
    () =>
      buildApiFilters({
        brand,
        productKind,
        rankMax,
      }),
    [brand, productKind, rankMax],
  );

  const hasSearchCriteria = Boolean(
    q.trim() ||
      sku.trim() ||
      apiFilters,
  );

  async function run() {
    const textQuery = q.trim();
    const skuQuery = sku.trim();

    if (!hasSearchCriteria) {
      return;
    }

    if (
      textQuery &&
      textQuery.length < 3 &&
      !skuQuery &&
      !apiFilters
    ) {
      setErr(
        "Enter at least 3 characters, or search by SKU, brand, category, or rank.",
      );
      return;
    }

    setLoading(true);
    setErr(null);
    setHasSearched(true);

    try {
      const result = await searchSneakersPage({
        q: textQuery || undefined,
        sku: skuQuery || undefined,
        filters: apiFilters,
        limit: 100,
      });

      setItems(result.data);
      setTotal(
        typeof result.meta?.total === "number"
          ? result.meta.total
          : null,
      );
    } catch (error: unknown) {
      setErr(
        error instanceof Error
          ? error.message
          : String(error),
      );
      setItems([]);
      setTotal(null);
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setGender("all");
    setMinP("");
    setMaxP("");
    setRankMax("");
    setSortBy("rank");
    setProductKind("all");
  }

  function resetAll() {
    setQ("");
    setSku("");
    setBrand("all");
    resetFilters();
    setItems([]);
    setTotal(null);
    setErr(null);
    setHasSearched(false);
  }

  const shown = useMemo(() => {
    const min = minP ? Number(minP) : undefined;
    const max = maxP ? Number(maxP) : undefined;
    const rmax = rankMax
      ? Number(rankMax)
      : undefined;

    const filtered = items.filter((product) => {
      if (!genderMatches(product, gender)) {
        return false;
      }

      if (!kindMatches(product, productKind)) {
        return false;
      }

      const price = productPrice(product);

      if (
        min !== undefined &&
        price !== undefined &&
        price < min
      ) {
        return false;
      }

      if (
        max !== undefined &&
        price !== undefined &&
        price > max
      ) {
        return false;
      }

      if (
        rmax !== undefined &&
        (product.rank ?? Infinity) > rmax
      ) {
        return false;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "rank") {
        return (
          (a.rank ?? Infinity) -
          (b.rank ?? Infinity)
        );
      }

      if (sortBy === "avg_price") {
        return (
          (productPrice(b) ?? 0) -
          (productPrice(a) ?? 0)
        );
      }

      if (sortBy === "avg_price_asc") {
        return (
          (productPrice(a) ?? 0) -
          (productPrice(b) ?? 0)
        );
      }

      const firstTime = a.updated_at
        ? Date.parse(a.updated_at)
        : 0;

      const secondTime = b.updated_at
        ? Date.parse(b.updated_at)
        : 0;

      return secondTime - firstTime;
    });
  }, [
    items,
    gender,
    minP,
    maxP,
    rankMax,
    sortBy,
    productKind,
  ]);

  return (
    <section className="space-y-10">
      <div className="max-w-3xl">
        <p className="eyebrow">
          Marketplace search
        </p>

        <h1 className="page-heading mt-4">
          Search products with cleaner filters.
        </h1>

        <p className="mt-5 text-base leading-7 text-white/60 sm:text-lg">
          Search sneakers, streetwear, collectibles, and
          other StockX marketplace products by name,
          brand, category, or SKU.
        </p>
      </div>

      <form
        className="surface-card space-y-6 p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          run();
        }}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,0.75fr)]">
          <div className="space-y-2">
            <FieldLabel>
              Product name or keyword
            </FieldLabel>

            <input
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white placeholder-white/35 transition focus:border-yellow-400/70"
              placeholder="Jordan 4, Supreme hoodie, Pokémon..."
              value={q}
              onChange={(event) =>
                setQ(event.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <FieldLabel>SKU / style code</FieldLabel>

            <input
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white placeholder-white/35 transition focus:border-yellow-400/70"
              placeholder="Example: CT8012-104"
              value={sku}
              onChange={(event) =>
                setSku(event.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <FieldLabel>Brand</FieldLabel>

            <select
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white transition focus:border-yellow-400/70"
              value={brand}
              onChange={(event) =>
                setBrand(event.target.value)
              }
            >
              {BRAND_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-2">
            <FieldLabel>Category</FieldLabel>

            <select
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white transition focus:border-yellow-400/70"
              value={productKind}
              onChange={(event) =>
                setProductKind(
                  event.target.value as ProductKind,
                )
              }
            >
              <option value="all">
                All categories
              </option>
              <option value="sneakers">
                Sneakers
              </option>
              <option value="streetwear">
                Streetwear
              </option>
              <option value="collectibles">
                Collectibles
              </option>
            </select>
          </div>

          <div className="space-y-2">
            <FieldLabel>Gender</FieldLabel>

            <select
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white transition focus:border-yellow-400/70"
              value={gender}
              onChange={(event) =>
                setGender(
                  event.target.value as GenderFilter,
                )
              }
            >
              <option value="all">All genders</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="kids">Kids / GS</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>

          <div className="space-y-2">
            <FieldLabel>Min price</FieldLabel>

            <input
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white placeholder-white/35 transition focus:border-yellow-400/70"
              type="number"
              min="0"
              step="1"
              placeholder="$0"
              value={minP}
              onChange={(event) =>
                setMinP(event.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <FieldLabel>Max price</FieldLabel>

            <input
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white placeholder-white/35 transition focus:border-yellow-400/70"
              type="number"
              min="0"
              step="1"
              placeholder="$500"
              value={maxP}
              onChange={(event) =>
                setMaxP(event.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <FieldLabel>Max rank</FieldLabel>

            <input
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white placeholder-white/35 transition focus:border-yellow-400/70"
              type="number"
              min="1"
              step="1"
              placeholder="Top 50"
              value={rankMax}
              onChange={(event) =>
                setRankMax(event.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <FieldLabel>Sort</FieldLabel>

            <select
              className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white transition focus:border-yellow-400/70"
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value as SortKey,
                )
              }
            >
              <option value="rank">
                Popularity rank
              </option>
              <option value="avg_price">
                Price high to low
              </option>
              <option value="avg_price_asc">
                Price low to high
              </option>
              <option value="updated_at">
                Recently updated
              </option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/45">
            Use at least one search field, brand,
            category, or rank filter.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] px-5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.07]"
            >
              Clear all
            </button>

            <button
              type="submit"
              disabled={
                loading || !hasSearchCriteria
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-yellow-400 px-6 text-sm font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading
                ? "Searching..."
                : "Search products"}
            </button>
          </div>
        </div>
      </form>

      {err && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {err}
        </div>
      )}

      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-heading">
              Search results
            </h2>

            <p className="mt-2 text-sm text-white/50">
              {hasSearched
                ? `${shown.length} shown${
                    total !== null
                      ? ` from ${total.toLocaleString()} matching products`
                      : ""
                  }.`
                : "Start with a name, SKU, brand, category, or rank filter."}
            </p>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="w-fit rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-white/25 hover:text-white"
          >
            Reset filters
          </button>
        </div>

        {loading ? (
          <LoadingGrid />
        ) : shown.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {shown.map((product) => (
              <ProductCard
                key={
                  product.slug ??
                  product.sku ??
                  product.id
                }
                product={product}
              />
            ))}
          </ul>
        ) : hasSearched ? (
          <div className="surface-card px-6 py-16 text-center">
            <p className="font-semibold text-white">
              No products found.
            </p>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/50">
              Try removing a filter, choosing a broader
              brand, or searching with a different keyword
              or SKU.
            </p>
          </div>
        ) : (
          <div className="surface-card px-6 py-16 text-center">
            <p className="font-semibold text-white">
              Search marketplace products.
            </p>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/50">
              Use the controls above to find sneakers,
              streetwear, collectibles, and other products.
            </p>
          </div>
        )}
      </section>
    </section>
  );
}