// /src/app/convert/page.tsx
'use client';
import { useMemo, useState } from 'react';

type Gender = 'men' | 'women' | 'gs';
type Field = 'us_men' | 'us_women' | 'us_gs' | 'eu_men' | 'eu_women';

const BOUNDS: Record<Gender, { min: number; max: number; label: string }> = {
    men: { min: 7.5, max: 16, label: 'US Men 7.5–16' },
    women: { min: 4, max: 15, label: 'US Women 4–15' },
    gs: { min: 1, max: 7, label: 'US GS 1–7' },
};

// Men US ↔ EU anchors (approx)
const MEN_US_EU: [number, number][] = [
    [6, 38.5], [6.5, 39], [7, 40], [7.5, 40.5], [8, 41], [8.5, 42], [9, 42.5], [9.5, 43],
    [10, 44], [10.5, 44.5], [11, 45], [11.5, 45.5], [12, 46], [12.5, 46.5], [13, 47.5], [14, 48.5],
];

const lerp = (x1: number, y1: number, x2: number, y2: number, x: number) =>
    y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);

function usMenToEu(us: number) {
    const a = MEN_US_EU;
    if (us <= a[0][0]) return a[0][1];
    if (us >= a[a.length - 1][0]) return a[a.length - 1][1];
    for (let i = 0; i < a.length - 1; i++) {
        const [x1, y1] = a[i], [x2, y2] = a[i + 1];
        if (us >= x1 && us <= x2) return lerp(x1, y1, x2, y2, us);
    }
    return a[a.length - 1][1];
}

function euToUsMen(eu: number) {
    const a = MEN_US_EU;
    if (eu <= a[0][1]) return a[0][0];
    if (eu >= a[a.length - 1][1]) return a[a.length - 1][0];
    for (let i = 0; i < a.length - 1; i++) {
        const [x1, y1] = a[i], [x2, y2] = a[i + 1];
        if (eu >= y1 && eu <= y2) return lerp(y1, x1, y2, x2, eu);
    }
    return a[a.length - 1][0];
}

// Anchor = Men US
const toMenUS = (size: number, g: Gender) => (g === 'women' ? size - 1.5 : size); // GS shares Men numeric scale
const fromMenUS = (men: number, g: Gender) => (g === 'women' ? men + 1.5 : men);

const roundHalf = (n: number) => Math.round(n * 2) / 2;
const round05 = (n: number) => Math.round(n * 2) / 2; // EU steps ~0.5

export default function ConvertPage() {
    const [src, setSrc] = useState<Field>('us_men');
    const [raw, setRaw] = useState<string>('9');

    const parsed = Number(raw);
    const menUS = useMemo(() => {
        if (Number.isNaN(parsed)) return NaN;
        switch (src) {
            case 'us_men': return parsed;
            case 'us_women': return toMenUS(parsed, 'women');
            case 'us_gs': return toMenUS(parsed, 'gs'); // = parsed
            case 'eu_men': return euToUsMen(parsed);
            case 'eu_women': return euToUsMen(parsed);
        }
    }, [parsed, src]);

    // Formatters with bounds for US; EU shown freely
    function fmtUS(g: Gender, val: number) {
        if (Number.isNaN(val)) return '';
        const r = roundHalf(val);
        const { min, max } = BOUNDS[g];
        return r < min || r > max ? 'N/A' : String(r);
    }
    function fmtEU(val: number) {
        if (Number.isNaN(val)) return '';
        const r = round05(usMenToEu(val));
        return Number.isInteger(r) ? String(r) : String(r);
    }

    const values = {
        us_men: fmtUS('men', menUS),
        us_women: fmtUS('women', fromMenUS(menUS, 'women')),
        us_gs: fmtUS('gs', fromMenUS(menUS, 'gs')),
        eu_men: fmtEU(menUS),
        eu_women: fmtEU(menUS),
    };

    const errorUS =
        !raw.trim() || Number.isNaN(parsed)
            ? 'Enter a number'
            : src === 'us_men' && (parsed < BOUNDS.men.min || parsed > BOUNDS.men.max)
                ? `Valid: ${BOUNDS.men.label}`
                : src === 'us_women' && (parsed < BOUNDS.women.min || parsed > BOUNDS.women.max)
                    ? `Valid: ${BOUNDS.women.label}`
                    : src === 'us_gs' && (parsed < BOUNDS.gs.min || parsed > BOUNDS.gs.max)
                        ? `Valid: ${BOUNDS.gs.label}`
                        : '';

    // Helpers for controlled inputs (source shows raw; others show computed)
    const display = (f: Field) => (src === f ? raw : values[f]);

    const onEdit = (f: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setSrc(f);
        setRaw(e.target.value);
    };

    return (
        <section className="space-y-6">
            <h1 className="font-brand text-2xl text-yellow-400">Size converter</h1>

            <div className="overflow-x-auto rounded-2xl border border-neutral-800">
                <table className="w-full text-sm">
                    <thead className="bg-neutral-900/60">
                        <tr className="text-left">
                            <th className="p-3">Category</th>
                            <th className="p-3">US</th>
                            <th className="p-3">EU</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 bg-neutral-900">
                        {/* Men */}
                        <tr>
                            <td className="p-3 align-top">Men</td>
                            <td className="p-3">
                                <input
                                    type="number" step="0.5" min={BOUNDS.men.min} max={BOUNDS.men.max} inputMode="decimal"
                                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white"
                                    value={display('us_men')}
                                    onChange={onEdit('us_men')}
                                    onFocus={() => setSrc('us_men')}
                                    aria-label="US Men"
                                />
                                {src === 'us_men' && errorUS && <p className="mt-1 text-xs text-white/50">{errorUS}</p>}
                            </td>
                            <td className="p-3">
                                <input
                                    type="number" step="0.5" inputMode="decimal"
                                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white"
                                    value={display('eu_men')}
                                    onChange={onEdit('eu_men')}
                                    onFocus={() => setSrc('eu_men')}
                                    aria-label="EU Men"
                                />
                            </td>
                        </tr>

                        {/* Women */}
                        <tr>
                            <td className="p-3 align-top">Women</td>
                            <td className="p-3">
                                <input
                                    type="number" step="0.5" min={BOUNDS.women.min} max={BOUNDS.women.max} inputMode="decimal"
                                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white"
                                    value={display('us_women')}
                                    onChange={onEdit('us_women')}
                                    onFocus={() => setSrc('us_women')}
                                    aria-label="US Women"
                                />
                                {src === 'us_women' && errorUS && <p className="mt-1 text-xs text-white/50">{errorUS}</p>}
                            </td>
                            <td className="p-3">
                                <input
                                    type="number" step="0.5" inputMode="decimal"
                                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white"
                                    value={display('eu_women')}
                                    onChange={onEdit('eu_women')}
                                    onFocus={() => setSrc('eu_women')}
                                    aria-label="EU Women"
                                />
                            </td>
                        </tr>

                        {/* GS */}
                        <tr>
                            <td className="p-3 align-top">GS</td>
                            <td className="p-3">
                                <input
                                    type="number" step="0.5" min={BOUNDS.gs.min} max={BOUNDS.gs.max} inputMode="decimal"
                                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white"
                                    value={display('us_gs')}
                                    onChange={onEdit('us_gs')}
                                    onFocus={() => setSrc('us_gs')}
                                    aria-label="US GS"
                                />
                                {src === 'us_gs' && errorUS && <p className="mt-1 text-xs text-white/50">{errorUS}</p>}
                            </td>
                            <td className="p-3 text-white/40">—</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <button
                    className="rounded-xl p-3 bg-[var(--accent)] text-black hover:brightness-110"
                    onClick={() => { setSrc('us_men'); setRaw('9'); }}
                >
                    Reset
                </button>
                <p className="text-xs text-white/60">
                    US limits: Men 7.5–16, Women 4–15, GS 1–7. EU sizes are unisex and derived from Men’s last; GS uses Men’s numeric scale.
                </p>
            </div>
        </section>
    );
}
