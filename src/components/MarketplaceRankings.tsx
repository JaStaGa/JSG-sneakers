"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Sneaker } from "@/lib/sneakerApi";

type RankingKey =
  | "all"
  | "sneakers"
  | "streetwear"
  | "collectibles";

type MarketplaceRankingsProps = {
  all: Sneaker[];
  sneakers: Sneaker[];
  streetwear: Sneaker[];
  collectibles: Sneaker[];
};

const TAB_OPTIONS: {
  key: RankingKey;
  label: string;
  heading: string;
  description: string;
}[] = [
  {
    key: "all",
    label: "All",
    heading: "Top products",
    description:
      "The highest-ranked products across the full marketplace.",
  },
  {
    key: "sneakers",
    label: "Sneakers",
    heading: "Top sneakers",
    description:
      "The highest-ranked footwear currently available in the marketplace data.",
  },
  {
    key: "streetwear",
    label: "Streetwear",
    heading: "Top streetwear",
    description:
      "The most popular apparel and streetwear products in the marketplace data.",
  },
  {
    key: "collectibles",
    label: "Collectibles",
    heading: "Top collectibles",
    description:
      "The highest-ranked figures, cards, toys, and other collectibles.",
  },
];

function productTitle(product: Sneaker) {
  return (
    product.title ??
    product.name ??
    "Untitled product"
  );
}

function productKey(product: Sneaker) {
  return String(
    product.slug ??
      product.sku ??
      product.id,
  ).toLowerCase();
}

function productHref(product: Sneaker) {
  const identifier =
    product.slug ??
    product.sku ??
    product.id;

  return `/sneaker/${encodeURIComponent(identifier)}`;
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

function displayPrice(product: Sneaker) {
  return formatPrice(
    product.avg_price ??
      product.min_price ??
      product.max_price,
  );
}

function productDetails(product: Sneaker) {
  return [
    product.brand,
    product.category,
    product.gender,
  ]
    .filter(Boolean)
    .join(" · ");
}

function ProductImage({
  product,
  className,
  sizes,
}: {
  product: Sneaker;
  className: string;
  sizes: string;
}) {
  const title = productTitle(product);

  return (
    <div
      className={`relative overflow-hidden bg-[#f3f3ef] ${className}`}
    >
      {product.image ? (
        <Image
          src={product.image}
          alt={title}
          fill
          className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.04]"
          sizes={sizes}
        />
      ) : (
        <div className="flex h-full items-center justify-center px-4 text-center text-xs font-medium uppercase tracking-[0.14em] text-black/45">
          Image unavailable
        </div>
      )}
    </div>
  );
}

function FeaturedProduct({
  product,
}: {
  product: Sneaker;
}) {
  const title = productTitle(product);
  const price = displayPrice(product);
  const details = productDetails(product);

  return (
    <Link
      href={productHref(product)}
      className="surface-card group overflow-hidden transition duration-200 hover:-translate-y-1 hover:border-yellow-400/40"
    >
      <div className="relative">
        <ProductImage
          product={product}
          className="aspect-[4/3] w-full"
          sizes="(max-width: 767px) 100vw, 33vw"
        />

        <span className="absolute left-3 top-3 inline-flex min-h-9 items-center rounded-full border border-black/10 bg-black px-3 text-xs font-bold text-yellow-400 shadow-lg">
          Marketplace #{product.rank ?? "—"}
        </span>
      </div>

      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-yellow-400">
          {product.brand ?? "Marketplace product"}
        </p>

        <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-white">
          {title}
        </h3>

        {details && (
          <p className="mt-2 line-clamp-1 text-sm text-white/50">
            {details}
          </p>
        )}

        <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-white/40">
              Average price
            </p>

            <p className="mt-1 text-lg font-semibold text-white">
              {price ?? "Not available"}
            </p>
          </div>

          <span className="text-sm font-medium text-yellow-400 transition-transform group-hover:translate-x-1">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}

function RankedProductRow({
  product,
}: {
  product: Sneaker;
}) {
  const title = productTitle(product);
  const price = displayPrice(product);
  const details = productDetails(product);

  return (
    <Link
      href={productHref(product)}
      className="surface-card group grid gap-4 p-4 transition duration-200 hover:border-yellow-400/35 sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="relative w-full sm:w-[92px]">
        <ProductImage
          product={product}
          className="aspect-[4/3] w-full rounded-xl sm:h-[76px] sm:aspect-auto"
          sizes="(max-width: 639px) 100vw, 92px"
        />

        <span className="absolute left-2 top-2 rounded-full bg-black px-2 py-1 text-[10px] font-bold text-yellow-400">
          #{product.rank ?? "—"}
        </span>
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-yellow-400">
          {product.brand ?? "Marketplace product"}
        </p>

        <h3 className="mt-1 truncate font-semibold text-white">
          {title}
        </h3>

        {details && (
          <p className="mt-1 truncate text-sm text-white/50">
            {details}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-3 sm:block sm:border-0 sm:pt-0 sm:text-right">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-white/40">
            Average price
          </p>

          <p className="mt-1 font-semibold text-white">
            {price ?? "N/A"}
          </p>
        </div>

        <span className="text-sm font-medium text-yellow-400 transition-transform group-hover:translate-x-1 sm:mt-2 sm:inline-block">
          View →
        </span>
      </div>
    </Link>
  );
}

export default function MarketplaceRankings({
  all,
  sneakers,
  streetwear,
  collectibles,
}: MarketplaceRankingsProps) {
  const [activeTab, setActiveTab] =
    useState<RankingKey>("all");

  const rankings: Record<RankingKey, Sneaker[]> = {
    all,
    sneakers,
    streetwear,
    collectibles,
  };

  const activeOption =
    TAB_OPTIONS.find(
      (option) => option.key === activeTab,
    ) ?? TAB_OPTIONS[0];

  const activeProducts = rankings[activeTab];
  const featuredProducts = activeProducts.slice(0, 3);
  const remainingProducts = activeProducts.slice(3);

  return (
    <div className="space-y-7">
      <div className="overflow-x-auto pb-1">
        <div
          role="tablist"
          aria-label="Marketplace ranking categories"
          className="inline-flex min-w-full gap-2 rounded-2xl border border-white/10 bg-white/[0.025] p-1.5 sm:min-w-0"
        >
          {TAB_OPTIONS.map((option) => {
            const isActive =
              activeTab === option.key;

            return (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`ranking-panel-${option.key}`}
                id={`ranking-tab-${option.key}`}
                onClick={() =>
                  setActiveTab(option.key)
                }
                className={[
                  "min-h-11 flex-1 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition sm:flex-none sm:px-6",
                  isActive
                    ? "bg-yellow-400 text-black shadow-[0_8px_30px_rgba(250,204,21,0.16)]"
                    : "text-white/55 hover:bg-white/[0.06] hover:text-white",
                ].join(" ")}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id={`ranking-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`ranking-tab-${activeTab}`}
        className="space-y-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="section-heading">
              {activeOption.heading}
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              {activeOption.description}
            </p>
          </div>

          <p className="shrink-0 text-sm text-white/40">
            Showing {activeProducts.length} products
          </p>
        </div>

        {activeProducts.length === 0 ? (
          <div className="surface-card px-6 py-14 text-center">
            <p className="font-semibold text-white">
              Rankings are temporarily unavailable.
            </p>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/50">
              The marketplace data service may be refreshing
              or temporarily unavailable. Try again shortly.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {featuredProducts.map((product) => (
                <FeaturedProduct
                  key={productKey(product)}
                  product={product}
                />
              ))}
            </div>

            {remainingProducts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/45">
                    More ranked products
                  </h4>

                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <div className="space-y-3">
                  {remainingProducts.map(
                    (product) => (
                      <RankedProductRow
                        key={productKey(product)}
                        product={product}
                      />
                    ),
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}