import { prisma } from "@/lib/prisma";
import { totaliBolletta } from "@/lib/bollette";

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
    ALTRO: "Altro",
};
export const CAT_ENTRATE = { LUNGHI: "Affitti lunghi", BREVI: "Affitti brevi" };

const chiaveDi = (unita, palazzina) =>
    palazzina?.nome ?? unita?.palazzina?.nome ?? unita?.nome ?? "Altro";

// Elenco unico di movimenti: { data, tipo: "entrata"|"uscita", cat, importo, chiave }
export async function caricaMovimenti() {
    const oggi = new Date();
    const movs = [];

    // canoni di competenza dei contratti lunghi
    const contratti = await prisma.contratto.findMany({
        where: { tipo: "LUNGO", canone: { not: null } },
        include: { unita: { include: { palazzina: true } } },
    });
    for (const c of contratti) {
        const ini = c.dataInizio.getTime();
        const fine = c.dataFine ? c.dataFine.getTime() : Date.UTC(9999, 0, 1);
        let y = c.dataInizio.getUTCFullYear();
        let m = c.dataInizio.getUTCMonth();
        while (true) {
            const start = Date.UTC(y, m, 1);
            if (start > oggi.getTime() || start > fine) break;
            const end = Date.UTC(y, m + 1, 0);
            const giorniMese = Math.round((end - start) / GIORNO) + 1;
            const da = Math.max(start, ini);
            const a = Math.min(end, fine);
            if (a >= da) {
                const f = Math.min((Math.round((a - da) / GIORNO) + 1) / giorniMese, 1);
                movs.push({ data: new Date(start), tipo: "entrata", cat: "LUNGHI", importo: r2(c.canone * f), chiave: chiaveDi(c.unita) });
            }
            m++;
            if (m > 11) { m = 0; y++; }
        }
    }

    // incassi affitti brevi
    const incassi = await prisma.incasso.findMany({ include: { unita: { include: { palazzina: true } } } });
    for (const i of incassi)
        movs.push({ data: i.data, tipo: "entrata", cat: "BREVI", importo: i.importo, chiave: chiaveDi(i.unita) });

    // spese
    const spese = await prisma.spesa.findMany({
        include: { palazzina: true, unita: { include: { palazzina: true } } },
    });
    for (const s of spese)
        movs.push({ data: s.data, tipo: "uscita", cat: s.categoria, importo: s.importo, chiave: chiaveDi(s.unita, s.palazzina) });

    // bollette: solo la parte a mio carico; il resto è un credito verso gli inquilini
    const bollette = await prisma.bolletta.findMany({
        include: { palazzina: true, unita: { include: { palazzina: true } }, quote: { include: { pagamenti: true } } },
    });
    let crediti = 0;
    for (const b of bollette) {
        const t = totaliBolletta(b);
        crediti += t.daIncassare;
        if (t.aCarico > 0.005)
            movs.push({
                data: b.dataPagamento ?? b.al,
                tipo: "uscita",
                cat: "BOLLETTE",
                importo: t.aCarico,
                chiave: chiaveDi(b.unita, b.palazzina),
            });
    }

    return { movs, crediti: r2(crediti) };
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