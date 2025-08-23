// /src/app/search/page.tsx
'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { searchSneakers, type Sneaker } from '@/lib/sneakerApi';

type GenderFilter = 'all' | 'men' | 'women' | 'kids' | 'unisex';
type SortKey = 'rank' | 'avg_price' | 'avg_price_asc' | 'updated_at';

export default function SearchPage() {
    const [q, setQ] = useState('');
    const [sku, setSku] = useState('');
    const [brand, setBrand] = useState('');
    const [gender, setGender] = useState<GenderFilter>('all');
    const [minP, setMinP] = useState(''); // numeric, keep as text for inputs
    const [maxP, setMaxP] = useState('');
    const [sortBy, setSortBy] = useState<SortKey>('rank');

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [items, setItems] = useState<Sneaker[]>([]);

    async function run() {
        if (!q.trim() && !sku.trim() && !brand.trim()) return;
        setLoading(true); setErr(null);
        try {
            const terms: string[] = [];
            if (q.trim()) terms.push(q.trim());
            if (brand.trim()) terms.push(brand.trim());
            const list = await searchSneakers({
                q: terms.length ? terms.join(' ') : undefined,
                sku: sku.trim() || undefined,
                limit: 50,
            });
            setItems(list);
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : String(e));
            setItems([]);
        } finally { setLoading(false); }
    }

    const shown = useMemo(() => {
        const min = minP ? Number(minP) : undefined;
        const max = maxP ? Number(maxP) : undefined;
        const g = gender;

        const filtered = items.filter((p) => {
            // gender
            if (g !== 'all') {
                const pg = (p.gender ?? '').toLowerCase();
                if (pg && pg !== g) return false;
            }
            // price window on a representative price
            const price = (p.avg_price ?? p.min_price ?? p.max_price) as number | undefined;
            if (min !== undefined && price !== undefined && price < min) return false;
            if (max !== undefined && price !== undefined && price > max) return false;
            return true;
        });

        const sorted = [...filtered].sort((a, b) => {
            if (sortBy === 'rank') return (a.rank ?? Infinity) - (b.rank ?? Infinity);
            if (sortBy === 'avg_price') return (b.avg_price ?? 0) - (a.avg_price ?? 0);      // High → Low
            if (sortBy === 'avg_price_asc') return (a.avg_price ?? 0) - (b.avg_price ?? 0);  // Low → High
            // updated_at desc
            const ta = a.updated_at ? Date.parse(a.updated_at) : 0;
            const tb = b.updated_at ? Date.parse(b.updated_at) : 0;
            return tb - ta;
        });

        return sorted;
    }, [items, gender, minP, maxP, sortBy]);

    return (
        <section className="space-y-6">
            <h1 className="font-brand text-2xl text-yellow-400">Search</h1>

            <form
                className="grid gap-3 sm:grid-cols-4"
                onSubmit={(e) => { e.preventDefault(); run(); }}
            >
                <input
                    className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white placeholder-white/40"
                    placeholder="Name"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
                <input
                    className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white placeholder-white/40"
                    placeholder="SKU e.g. CT8012-104"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                />
                <input
                    className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white placeholder-white/40"
                    placeholder="Brand (optional)"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                />
                <button
                    type="submit"
                    className="rounded-xl p-3 bg-[var(--accent)] text-black hover:brightness-110 disabled:opacity-50"
                    disabled={loading || (!q.trim() && !sku.trim() && !brand.trim())}
                >
                    {loading ? 'Searching…' : 'Search'}
                </button>
            </form>

            {/* Filters */}
            <div className="grid gap-3 sm:grid-cols-5">
                <select
                    className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as GenderFilter)}
                    title="Gender"
                >
                    <option value="all">All genders</option>
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                    <option value="kids">Kids/GS</option>
                    <option value="unisex">Unisex</option>
                </select>

                <input
                    className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white"
                    type="number" min="0" step="1" placeholder="Min price"
                    value={minP}
                    onChange={(e) => setMinP(e.target.value)}
                    title="Min avg price"
                />
                <input
                    className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white"
                    type="number" min="0" step="1" placeholder="Max price"
                    value={maxP}
                    onChange={(e) => setMaxP(e.target.value)}
                    title="Max avg price"
                />
                <select
                    className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortKey)}
                    title="Sort"
                >
                    <option value="rank">Sort: Popular</option>
                    <option value="avg_price">Price: High → Low</option>
                    <option value="avg_price_asc">Price: Low → High</option>
                    <option value="updated_at">Sort: Updated ↓</option>
                </select>

                <button
                    className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white"
                    type="button"
                    onClick={() => { setGender('all'); setMinP(''); setMaxP(''); setSortBy('rank'); }}
                >
                    Reset filters
                </button>
            </div>

            {err && <p className="text-sm text-red-400">Error: {err}</p>}

            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((p) => {
                    const href = `/sneaker/${encodeURIComponent(p.slug ?? p.sku ?? p.id)}`;
                    return (
                        <li
                            key={p.id}
                            className="rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden hover:border-[var(--accent)]"
                        >
                            <Link href={href} className="block">
                                {p.image && (
                                    <div className="relative aspect-video">
                                        <Image
                                            src={p.image}
                                            alt={p.title ?? p.name ?? 'Sneaker'}
                                            fill
                                            className="object-cover"
                                            sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                                        />
                                    </div>
                                )}
                                <div className="p-3 space-y-1">
                                    <div className="font-medium">{p.title ?? p.name ?? 'Untitled'}</div>
                                    <div className="text-sm text-white/70">{p.brand} {p.model}</div>
                                    <div className="text-sm text-white/80">SKU: {p.sku ?? '—'}</div>
                                    <div className="text-xs text-white/50">
                                        {p.avg_price !== undefined ? `Avg $${Math.round(p.avg_price)}` : ''}
                                        {p.rank !== undefined ? ` · Rank ${p.rank}` : ''}
                                        {p.gender ? ` · ${p.gender}` : ''}
                                    </div>
                                </div>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
