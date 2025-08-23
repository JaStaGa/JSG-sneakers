// /src/app/sneaker/[slug]/page.tsx
export const dynamic = 'force-dynamic';

import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import type { Sneaker } from '@/lib/sneakerApi';

async function absoluteUrl(path: string) {
    const h = await headers();
    const proto = h.get('x-forwarded-proto') ?? 'http';
    const host =
        h.get('x-forwarded-host') ??
        h.get('host') ??
        process.env.VERCEL_URL ??
        'localhost:3000';
    return `${proto}://${host}${path}`;
}

function pickBest(items: Sneaker[], key: string): Sneaker | null {
    const q = key.toLowerCase();
    const exactSlug = items.find((p) => (p.slug ?? '').toLowerCase() === q);
    if (exactSlug) return exactSlug;
    const exactSku = items.find((p) => (p.sku ?? '').toLowerCase() === q);
    if (exactSku) return exactSku;
    const contains = items.find((p) => (p.title ?? p.name ?? '').toLowerCase().includes(q));
    return contains ?? items[0] ?? null;
}

export default async function Page({ params }: { params: { slug: string } }) {
    const key = decodeURIComponent(params.slug);
    const search = new URLSearchParams({ q: key, limit: '25' });
    const url = await absoluteUrl(`/api/sneakers/search?${search.toString()}`);
    const res = await fetch(url, { cache: 'no-store' }); if (!res.ok) {
        return (
            <main className="space-y-4">
                <Link href="/search" className="text-yellow-400">← Back to search</Link>
                <p className="text-red-400">Failed to load item.</p>
            </main>
        );
    }
    const json = await res.json();
    const list: Sneaker[] = Array.isArray(json) ? json : json.data ?? [];
    const item = pickBest(list, key);

    if (!item) {
        return (
            <main className="space-y-4">
                <Link href="/search" className="text-yellow-400">← Back to search</Link>
                <p>No item found.</p>
            </main>
        );
    }

    const title = item.title ?? item.name ?? 'Sneaker';

    return (
        <main className="space-y-6">
            <Link href="/search" className="text-yellow-400">← Back to search</Link>
            <header className="space-y-2">
                <h1 className="font-brand text-2xl text-yellow-400">{title}</h1>
                <p className="text-white/70">
                    {item.brand} {item.model} {item.gender ? `· ${item.gender}` : ''} {item.category ? `· ${item.category}` : ''}
                </p>
                <p className="text-white/60">SKU: {item.sku ?? '—'}</p>
            </header>

            {item.image && (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-neutral-800">
                    <Image
                        src={item.image}
                        alt={title}
                        fill
                        className="object-cover"
                        sizes="100vw"
                    />
                </div>
            )}

            {item.gallery?.length ? (
                <ul className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {item.gallery.slice(0, 12).map((src, i) => (
                        <li key={i} className="relative aspect-[4/3] border border-neutral-800 rounded-lg overflow-hidden">
                            <Image src={src} alt={`${title} ${i + 1}`} fill className="object-cover" sizes="20vw" />
                        </li>
                    ))}
                </ul>
            ) : null}

            {/* Prices: show Avg and Max. No Min. */}
            {(typeof item.avg_price === 'number' || typeof item.max_price === 'number') && (
                <p className="text-white/80">
                    {typeof item.avg_price === 'number' ? `Avg $${Math.round(item.avg_price)}` : null}
                    {typeof item.avg_price === 'number' && typeof item.max_price === 'number' ? ' · ' : null}
                    {typeof item.max_price === 'number' ? `Max $${Math.round(item.max_price)}` : null}
                </p>
            )}

            {item.weekly_orders !== undefined || item.rank !== undefined ? (
                <p className="text-white/60">
                    {item.rank !== undefined ? `Rank ${item.rank}` : ''}{item.rank !== undefined && item.weekly_orders !== undefined ? ' · ' : ''}
                    {item.weekly_orders !== undefined ? `${item.weekly_orders} weekly orders` : ''}
                </p>
            ) : null}

            {item.description ? (
                <article
                    className="prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: item.description }}
                />
            ) : item.short_description ? (
                <p className="text-white/80">{item.short_description}</p>
            ) : null}

            <dl className="grid sm:grid-cols-2 gap-2 text-sm text-white/70">
                {item.secondary_category && (<div><dt className="font-semibold">Line</dt><dd>{item.secondary_category}</dd></div>)}
                {item.product_type && (<div><dt className="font-semibold">Type</dt><dd>{item.product_type}</dd></div>)}
                {item.updated_at && (<div><dt className="font-semibold">Updated</dt><dd>{new Date(item.updated_at).toLocaleString()}</dd></div>)}
                {item.created_at && (<div><dt className="font-semibold">Created</dt><dd>{new Date(item.created_at).toLocaleString()}</dd></div>)}
            </dl>

            {item.link && (
                <p>
                    <a href={item.link} target="_blank" rel="noreferrer" className="text-yellow-400 underline">
                        View on StockX
                    </a>
                </p>
            )}
        </main>
    );
}
