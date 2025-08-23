'use client';
import { useState } from "react";

type Gender = 'men' | 'women' | 'gs';
type Region = 'US' | 'EU';

const MEN_US_EU: [number, number][] = [
    [6, 38.5], [6.5, 39], [7, 40], [7.5, 40.5], [8, 41], [8.5, 42], [9, 42.5], [9.5, 43],
    [10, 44], [10.5, 44.5], [11, 45], [11.5, 45.5], [12, 46], [12.5, 46.5], [13, 47.5], [14, 48.5],
];

function lerp(x1: number, y1: number, x2: number, y2: number, x: number) { return y1 + ((y2 - y1) * (x - x1)) / (x2 - x1); }
function usMenToEu(us: number) {
    const a = MEN_US_EU;
    if (us <= a[0][0]) return a[0][1];
    if (us >= a[a.length - 1][0]) return a[a.length - 1][1];
    for (let i = 0; i < a.length - 1; i++) { const [x1, y1] = a[i], [x2, y2] = a[i + 1]; if (us >= x1 && us <= x2) return lerp(x1, y1, x2, y2, us); }
    return a[a.length - 1][1];
}
function euToUsMen(eu: number) {
    const a = MEN_US_EU;
    if (eu <= a[0][1]) return a[0][0];
    if (eu >= a[a.length - 1][1]) return a[a.length - 1][0];
    for (let i = 0; i < a.length - 1; i++) { const [x1, y1] = a[i], [x2, y2] = a[i + 1]; if (eu >= y1 && eu <= y2) return lerp(y1, x1, y2, x2, eu); }
    return a[a.length - 1][0];
}
const toMenUS = (size: number, g: Gender) => g === 'women' ? size - 1.5 : g === 'gs' ? size + 1.5 : size;
const fromMenUS = (men: number, g: Gender) => g === 'women' ? men + 1.5 : g === 'gs' ? men - 1.5 : men;

function convert(value: number, fromG: Gender, fromR: Region, toG: Gender, toR: Region) {
    let menUS: number;
    if (fromR === 'US') menUS = toMenUS(value, fromG);
    else menUS = toMenUS(euToUsMen(value), fromG);
    if (toR === 'US') return Math.round(fromMenUS(menUS, toG) * 2) / 2;
    const targetUS = fromMenUS(menUS, toG);
    return Math.round(usMenToEu(targetUS) * 10) / 10;
}

export default function ConvertPage() {
    const [val, setVal] = useState("9");
    const [fromG, setFromG] = useState<Gender>('men');
    const [fromR, setFromR] = useState<Region>('US');
    const [toG, setToG] = useState<Gender>('women');
    const [toR, setToR] = useState<Region>('EU');
    const [out, setOut] = useState("");

    function run() {
        const n = Number(val);
        if (Number.isNaN(n)) { setOut("Enter a number"); return; }
        setOut(String(convert(n, fromG, fromR, toG, toR)));
    }

    return (
        <section className="space-y-6">
            <h1 className="font-brand text-2xl text-yellow-400">Size converter</h1>

            <div className="grid gap-3 sm:grid-cols-6 items-center">
                <input className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white" value={val} onChange={e => setVal(e.target.value)} />
                <select className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white" value={fromG} onChange={e => setFromG(e.target.value as Gender)}>
                    <option value="men">US Men</option><option value="women">US Women</option><option value="gs">US GS</option>
                </select>
                <select className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white" value={fromR} onChange={e => setFromR(e.target.value as Region)}>
                    <option value="US">US</option><option value="EU">EU</option>
                </select>
                <span className="text-center">→</span>
                <select className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white" value={toG} onChange={e => setToG(e.target.value as Gender)}>
                    <option value="men">Men</option><option value="women">Women</option><option value="gs">GS</option>
                </select>
                <select className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 text-white" value={toR} onChange={e => setToR(e.target.value as Region)}>
                    <option value="US">US</option><option value="EU">EU</option>
                </select>
            </div>

            <div className="flex gap-3">
                <button className="rounded-xl p-3 bg-[var(--accent)] text-black hover:brightness-110" onClick={run}>Convert</button>
                <input className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 w-40 text-white" readOnly value={out} placeholder="Result" />
            </div>

            <p className="text-xs text-white/60">
                Rule of thumb: Women ≈ Men + 1.5. GS ≈ Men − 1.5. EU varies by brand.
            </p>
        </section>
    );
}
