import { prisma } from "@/lib/prisma";
import { totaliBolletta } from "@/lib/bollette";
import { situazioneCanoni } from "@/lib/canoni";
import { sincronizzaRicorrenti } from "@/lib/ricorrenti";
import { dataAcq } from "./investimento";

const GIORNO = 86400000;
const r2 = (n) => Math.round(n * 100) / 100;

export const MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

export const CAT_USCITE = {
    BOLLETTE: "Bollette a mio carico",
    IMU: "IMU",
    CEDOLARE: "Cedolare secca",
    CONDOMINIO: "Condominio",
    ORDINARIA: "Manutenzione ordinaria",
    STRAORDINARIA: "Ristrutturazioni straord.",
    MUTUO: "Rate mutuo / prestiti",
    ALTRO: "Altro",
};
export const CAT_ENTRATE = { LUNGHI: "Affitti lunghi", BREVI: "Affitti brevi", TRATTENUTE: "Trattenute da cauzione" };

const chiaveDi = (unita, palazzina) =>
    palazzina?.nome ?? unita?.palazzina?.nome ?? unita?.nome ?? "Altro";

const rif = (unita, palazzina) => ({
    chiave: chiaveDi(unita, palazzina),
    unitaId: unita?.id ?? null,
    palazzinaId: palazzina?.id ?? unita?.palazzinaId ?? null,
});
// Elenco unico di movimenti: { data, tipo: "entrata"|"uscita", cat, importo, chiave }
export async function caricaMovimenti() {
    await sincronizzaRicorrenti();
    const movs = [];

    const contratti = await prisma.contratto.findMany({
        where: { tipo: "LUNGO" },
        include: { canoni: true, unita: { include: { palazzina: true } } },
    });
    let arretrati = 0;
    for (const c of contratti) {
        const acq = dataAcq(c.unita);
        for (const p of c.canoni) {
            if (acq && p.data < acq) continue;
            movs.push({ data: p.data, tipo: "entrata", cat: "LUNGHI", importo: p.importo, ...rif(c.unita) });
        }
        arretrati += situazioneCanoni(c).arretrati;
    }

    const incassi = await prisma.incasso.findMany({ include: { unita: { include: { palazzina: true } } } });
    for (const i of incassi) {
        const acq = dataAcq(i.unita);
        if (acq && i.data < acq) continue;
        movs.push({ data: i.data, tipo: "entrata", cat: "BREVI", importo: i.importo, ...rif(i.unita) });
    }

    // trattenute da cauzione (danni, pulizie…) alla liquidazione
    const tratt = await prisma.trattenutaCauzione.findMany({
        where: { applicato: { gt: 0 } },
        include: { contratto: { include: { unita: { include: { palazzina: true } } } } },
    });
    for (const t of tratt)
        if (t.contratto.cauzioneRestituitaIl)
            movs.push({ data: t.contratto.cauzioneRestituitaIl, tipo: "entrata", cat: "TRATTENUTE", importo: t.applicato, ...rif(t.contratto.unita) });

    const spese = await prisma.spesa.findMany({
        include: { palazzina: true, unita: { include: { palazzina: true } } },
    });
    for (const s of spese)
        movs.push({ data: s.data, tipo: "uscita", cat: s.categoria, importo: s.importo, ...rif(s.unita, s.palazzina) });

    const bollette = await prisma.bolletta.findMany({
        include: { palazzina: true, unita: { include: { palazzina: true } }, quote: { include: { pagamenti: true } } },
    });
    let crediti = 0;
    for (const b of bollette) {
        const t = totaliBolletta(b);
        crediti += t.daIncassare;
        if (t.aCarico > 0.005)
            movs.push({ data: b.dataPagamento ?? b.al, tipo: "uscita", cat: "BOLLETTE", importo: t.aCarico, ...rif(b.unita, b.palazzina) });
    }

    return { movs, crediti: r2(crediti), arretrati: r2(arretrati) };
}

// 12 mesi di un anno; i mesi oltre `fino` restano vuoti (anno in corso)
export function serieMensile(movs, anno, fino = 12) {
    const righe = Array.from({ length: 12 }, () => ({ entrate: 0, uscite: 0 }));
    for (const m of movs)
        if (m.data.getUTCFullYear() === anno) righe[m.data.getUTCMonth()][m.tipo === "entrata" ? "entrate" : "uscite"] += m.importo;

    let cum = 0;
    return righe.map((r, i) => {
        if (i >= fino) return { mese: MESI[i], entrate: null, uscite: null, risultato: null, cumulato: null };
        const e = r2(r.entrate);
        const u = r2(r.uscite);
        cum = r2(cum + e - u);
        return { mese: MESI[i], entrate: e, uscite: u, risultato: r2(e - u), cumulato: cum };
    });
}

export function totaleFino(serie, fino = 12) {
    let entrate = 0;
    let uscite = 0;
    serie.slice(0, fino).forEach((r) => {
        entrate += r.entrate ?? 0;
        uscite += r.uscite ?? 0;
    });
    return { entrate: r2(entrate), uscite: r2(uscite), risultato: r2(entrate - uscite) };
}

export function perCategoria(movs, anno, fino, tipo) {
    const o = {};
    for (const m of movs)
        if (m.tipo === tipo && m.data.getUTCFullYear() === anno && m.data.getUTCMonth() < fino)
            o[m.cat] = (o[m.cat] ?? 0) + m.importo;
    for (const k in o) o[k] = r2(o[k]);
    return o;
}

export function perChiave(movs, anno, fino) {
    const o = {};
    for (const m of movs) {
        if (m.data.getUTCFullYear() !== anno || m.data.getUTCMonth() >= fino) continue;
        o[m.chiave] ??= { chiave: m.chiave, entrate: 0, uscite: 0 };
        o[m.chiave][m.tipo === "entrata" ? "entrate" : "uscite"] += m.importo;
    }
    return Object.values(o)
        .map((x) => ({ ...x, entrate: r2(x.entrate), uscite: r2(x.uscite), risultato: r2(x.entrate - x.uscite) }))
        .sort((a, b) => b.entrate - a.entrate);
}