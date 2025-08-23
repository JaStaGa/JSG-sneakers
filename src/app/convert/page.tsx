// /src/app/convert/page.tsx
'use client';
import { useState } from 'react';

type Gender = 'men' | 'women' | 'gs';
type Region = 'US' | 'EU';

// Men US ↔ EU anchors (approx)
const MEN_US_EU: [number, number][] = [
    [6, 38.5], [6.5, 39], [7, 40], [7.5, 40.5], [8, 41], [8.5, 42], [9, 42.5], [9.5, 43],
    [10, 44], [10.5, 44.5], [11, 45], [11.5, 45.5], [12, 46], [12.5, 46.5], [13, 47.5], [14, 48.5],
];

// Big Kids/GS supported US range
const GS_MIN = 3.5;
const GS_MAX = 7;

const roundHalf = (n: number) => Math.round(n * 2) / 2;

function lerp(x1: number, y1: number, x2: number, y2: number, x: number) {
    return y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
}
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

// US gender offsets (Men is the anchor)
// Women ≈ Men + 1.5; GS (Big Kids) ≈ Men (same numeric) within GS range
const toMenUS = (size: number, g: Gender) =>
    g === 'women' ? size - 1.5 : g === 'gs' ? size : size;

const fromMenUS = (men: number, g: Gender) =>
    g === 'women' ? men + 1.5 : g === 'gs' ? men : men;

export default function ConvertPage() {
    const [val, setVal] = useState('9');
    const [fromG, setFromG] = useState<Gender>('men');
    const [fromR, setFromR] = useState<Region>('US');
    const [toG, setToG] = useState<Gender>('women');
    const [toR, setToR] = useState<Region>('EU');
    const [out, setOut] = useState('');

    function run(e?: React.FormEvent) {
        if (e) e.preventDefault();
        const n = Number(val);
        if (Number.isNaN(n)) { setOut('Enter a number'); return; }

        // Validate GS input range when converting *from* GS US
        if (fromR === 'US' && fromG === 'gs' && (n < GS_MIN || n > GS_MAX)) {
            setOut(`N/A (GS US is ${GS_MIN}–${GS_MAX})`);
            return;
        }

        // Convert input to the Men/US anchor
        const menUS = fromR === 'US' ? toMenUS(n, fromG) : toMenUS(euToUsMen(n), fromG);

        if (toR === 'US') {
            const targetUS = fromMenUS(menUS, toG);
            if (toG === 'gs' && (targetUS < GS_MIN || targetUS > GS_MAX)) {
                setOut(`N/A (GS US is ${GS_MIN}–${GS_MAX})`);
                return;
            }
            setOut(String(roundHalf(targetUS)));
            return;
        }

        // toR === 'EU'
        const targetUS = fromMenUS(menUS, toG);
        const eu = usMenToEu(targetUS);
        setOut(String(Math.round(eu * 10) / 10));
    }

    return (
        <section className="space-y-6">
            <h1 className="font-brand text-2xl text-yellow-400">Size converter</h1>

            <form className="grid gap-3 sm:grid-cols-6 items-center" onSubmit={run}>
                <input
                    className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white"
                    value={val}
                    onChange={e => setVal(e.target.value)}
                    inputMode="decimal"
                />
                <select className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white"
                    value={fromG} onChange={e => setFromG(e.target.value as Gender)}>
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                    <option value="gs">GS</option>
                </select>
                <select className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white"
                    value={fromR} onChange={e => setFromR(e.target.value as Region)}>
                    <option value="US">US</option><option value="EU">EU</option>
                </select>
                <span className="text-center">→</span>
                <select className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white"
                    value={toG} onChange={e => setToG(e.target.value as Gender)}>
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                    <option value="gs">GS</option>
                </select>
                <select className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white"
                    value={toR} onChange={e => setToR(e.target.value as Region)}>
                    <option value="US">US</option><option value="EU">EU</option>
                </select>

                <button type="submit"
                    className="rounded-xl p-3 bg-[var(--accent)] text-black hover:brightness-110">
                    Convert
                </button>
            </form>

            <div className="flex gap-3">
                <input
                    className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 w-40 text-white"
                    readOnly value={out} placeholder="Result"
                />
            </div>

            <p className="text-xs text-white/60">
                Rules of thumb: Women ≈ Men + 1.5. GS (Big Kids) uses the same numeric scale as Men
                within GS sizes ({GS_MIN}–{GS_MAX} US). EU mapping is approximate and varies by brand.
            </p>
        </section>
    );
}
