import { dataAcq, dataVend } from "./investimento";
import { fineEffettiva } from "./scadenze";

const GIORNO = 86400000;
const r2 = (n) => Math.round(n * 100) / 100;
const chiave = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`;

export const STATI_CANONE = {
    pagato: ["Pagato", "bg-green-100 text-green-800"],
    parziale: ["Parziale", "bg-yellow-100 text-yellow-800"],
    non_pagato: ["Non pagato", "bg-red-100 text-red-800"],
    da_incassare: ["Da incassare", "bg-gray-100 text-gray-700"],
};

// mesi dovuti dall'inizio del contratto fino a oggi (o fino al rilascio), con proporzione nei mesi parziali
export function mesiAttesi(c, oggi = new Date()) {
    if (!c.canone) return [];
    // i canoni sono dovuti dal più tardi tra inizio contratto e acquisto dell'unità
    const acquisto = dataAcq(c.unita)?.getTime() ?? -Infinity;
    const ini = Math.max(c.dataInizio.getTime(), acquisto);
    const fe = fineEffettiva(c);
    const vend = dataVend(c.unita);
    const fine = Math.min(fe ? fe.getTime() : Infinity, vend ? vend.getTime() : Infinity);
    const out = [];
    const inizio = new Date(ini);
    let y = inizio.getUTCFullYear();
    let m = inizio.getUTCMonth();
    while (true) {
        const start = Date.UTC(y, m, 1);
        if (start > oggi.getTime() || start > fine) break;
        const end = Date.UTC(y, m + 1, 0);
        const giorniMese = Math.round((end - start) / GIORNO) + 1;
        const da = Math.max(start, ini);
        const a = Math.min(end, fine);
        if (a >= da) {
            const f = Math.min((Math.round((a - da) / GIORNO) + 1) / giorniMese, 1);
            out.push({ mese: chiave(y, m), atteso: r2(c.canone * f) });
        }
        m++;
        if (m > 11) { m = 0; y++; }
    }
    return out;
}

// c deve includere i canoni: { ..., canoni: [...] }
export function situazioneCanoni(c, oggi = new Date()) {
    const mesi = new Map(mesiAttesi(c, oggi).map((a) => [a.mese, { ...a, incassato: 0 }]));
    for (const p of c.canoni ?? []) {
        const r = mesi.get(p.mese) ?? { mese: p.mese, atteso: 0, incassato: 0 };
        r.incassato += p.importo;
        mesi.set(p.mese, r);
    }
    const corrente = chiave(oggi.getUTCFullYear(), oggi.getUTCMonth());
    const righe = [...mesi.values()]
        .sort((a, b) => (a.mese < b.mese ? -1 : 1))
        .map((r) => {
            const residuo = r2(r.atteso - r.incassato);
            const stato =
                residuo <= 0.005 ? "pagato" : r.incassato > 0 ? "parziale" : r.mese < corrente ? "non_pagato" : "da_incassare";
            return { ...r, incassato: r2(r.incassato), residuo, stato };
        });
    const arretrati = r2(righe.filter((r) => r.mese < corrente && r.residuo > 0.005).reduce((t, r) => t + r.residuo, 0));
    return { righe, arretrati, corrente };
}