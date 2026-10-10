import { prisma } from "@/lib/prisma";
import { impostaContratti } from "@/lib/cedolare";
import { pianoFinanziamento, statoAlla } from "@/lib/finanziamento";
import { dataAcq, dataVend } from "@/lib/investimento";
import { MESI } from "@/lib/dashboard";

const GIORNO = 86400000;
const r2 = (n) => Math.round(n * 100) / 100;
const gg = (s, e) => (e < s ? 0 : Math.round((e - s) / GIORNO) + 1); // timestamp, estremi inclusi
const somma = (arr, f) => arr.reduce((t, x) => t + f(x), 0);
// quota capitale delle rate, lavori straordinari e cedolare (calcolata a parte) non sono costi di gestione
const ESCLUSE = new Set(["MUTUO", "STRAORDINARIA", "CEDOLARE"]);

const inizioPossesso = (u) =>
    Math.max(dataAcq(u)?.getTime() ?? -Infinity, (u.inizioMisura ?? u.palazzina?.inizioMisura)?.getTime() ?? -Infinity);

function riga(nome, id, giorni, o) {
    const costo = o.dir + o.cond + o.ced + o.int;
    return {
        id, nome, giorni,
        incasso: r2(o.incasso), costo: r2(costo),
        dir: r2(o.dir), cond: r2(o.cond), ced: r2(o.ced), int: r2(o.int),
        incassoDie: giorni ? o.incasso / giorni : null,
        costoDie: giorni ? costo / giorni : null,
        margineDie: giorni ? (o.incasso - costo) / giorni : null,
        notti: o.notti ?? null,
        occ: o.notti != null && giorni ? o.notti / giorni : null,
        ricavoNotte: o.notti ? o.brevi / o.notti : null,
    };
}

// movs: i movimenti già caricati dalla dashboard; fino = numero del mese (1-12) a cui fermarsi
export async function redditivita(movs, anno, fino) {
    const da = Date.UTC(anno, 0, 1);
    const a = Date.UTC(anno, fino, 0);
    const t = (m) => m.data.getTime();
    const dentro = (m, s, e) => t(m) >= s && t(m) <= e;

    const conCatasto = { catasto: { select: { superficie: true } } };
    const palazzine = await prisma.palazzina.findMany({ include: { unita: { include: conCatasto } }, orderBy: { nome: "asc" } });
    const autonome = await prisma.unita.findMany({ where: { palazzinaId: null }, include: conCatasto, orderBy: { nome: "asc" } });
    const pren = await prisma.prenotazione.findMany({
        where: { stato: "CONFERMATA", blocco: false, checkIn: { lte: new Date(a) }, checkOut: { gt: new Date(da) } },
    });
    const finanz = await prisma.finanziamento.findMany();

    const cedUnita = {};
    for (const c of await impostaContratti(anno, { fino: a })) cedUnita[c.unitaId] = (cedUnita[c.unitaId] ?? 0) + c.imposta;

    const interessi = (f) =>
        somma(pianoFinanziamento(f).filter((r) => r.data.getTime() >= da && r.data.getTime() <= a), (r) => r.interessi);

    const periodo = (u) => {
        const s = Math.max(da, inizioPossesso(u));
        const e = Math.min(a, dataVend(u)?.getTime() ?? Infinity);
        return { s, e, giorni: gg(s, e) };
    };

    const notti = (uid, s, e) =>
        somma(pren.filter((p) => p.unitaId === uid), (p) => {
            const x = Math.max(p.checkIn.getTime(), s);
            const y = Math.min(p.checkOut.getTime(), e + GIORNO);
            return Math.max(0, Math.round((y - x) / GIORNO));
        });

    const unitaRiga = (u, per, cond) => {
        const mie = (m) => m.unitaId === u.id && dentro(m, per.s, per.e);
        const entrate = movs.filter((m) => mie(m) && m.tipo === "entrata");
        return riga(u.nome, u.id, per.giorni, {
            incasso: somma(entrate, (m) => m.importo),
            brevi: somma(entrate.filter((m) => m.cat === "BREVI"), (m) => m.importo),
            dir: somma(movs.filter((m) => mie(m) && m.tipo === "uscita" && !ESCLUSE.has(m.cat)), (m) => m.importo),
            cond,
            ced: cedUnita[u.id] ?? 0,
            int: somma(finanz.filter((f) => f.unitaId === u.id), interessi),
            notti: u.affittoBreve ? notti(u.id, per.s, per.e) : null,
        });
    };

    const gruppo = (nome, id, units, conPool) => {
        const att = units.map((u) => ({ u, per: periodo(u) })).filter((x) => x.per.giorni > 0);
        if (!att.length) return null;
        const minS = Math.min(...att.map((x) => x.per.s));
        const maxE = Math.max(...att.map((x) => x.per.e));
        const tuttiSup = att.every((x) => x.u.catasto?.superficie > 0);
        const peso = (x) => (tuttiSup ? x.u.catasto.superficie : 1);
        const wTot = somma(att, peso);

        // costi della palazzina: spese sull'intera palazzina e interessi dei suoi finanziamenti
        const pool = conPool
            ? somma(
                movs.filter((m) => m.palazzinaId === id && !m.unitaId && m.tipo === "uscita" && !ESCLUSE.has(m.cat) && dentro(m, minS, maxE)),
                (m) => m.importo
            ) + somma(finanz.filter((f) => f.palazzinaId === id && !f.unitaId), interessi)
            : 0;

        const unita = att.map((x) => unitaRiga(x.u, x.per, (pool * peso(x)) / wTot));
        const brevi = unita.some((u) => u.notti != null);
        const tot = conPool
            ? riga(nome, id, gg(minS, maxE), {
                incasso: somma(unita, (u) => u.incasso),
                brevi: somma(unita, (u) => (u.ricavoNotte ?? 0) * (u.notti ?? 0)),
                dir: somma(unita, (u) => u.dir),
                cond: somma(unita, (u) => u.cond),
                ced: somma(unita, (u) => u.ced),
                int: somma(unita, (u) => u.int),
                notti: brevi ? somma(unita, (u) => u.notti ?? 0) : null,
            })
            : null;
        return { id, nome, tot, unita };
    };

    const gruppi = [];
    for (const p of palazzine) {
        const g = gruppo(p.nome, p.id, p.unita.map((u) => ({ ...u, palazzina: p })), true);
        if (g) gruppi.push(g);
    }
    const sing = gruppo("Unità autonome", 0, autonome, false);
    if (sing) gruppi.push(sing);
    return { gruppi };
}

// occupazione e incassi mensili degli affitti brevi
export async function occupazioneMensile(movs, anno, fino) {
    const brevi = await prisma.unita.findMany({ where: { affittoBreve: true }, include: { palazzina: true } });
    if (!brevi.length) return [];
    const ids = new Set(brevi.map((u) => u.id));
    const pren = await prisma.prenotazione.findMany({
        where: {
            stato: "CONFERMATA", blocco: false, unitaId: { in: [...ids] },
            checkIn: { lte: new Date(Date.UTC(anno, 11, 31)) }, checkOut: { gt: new Date(Date.UTC(anno, 0, 1)) },
        },
    });

    const out = [];
    for (let m = 0; m < fino; m++) {
        const ms = Date.UTC(anno, m, 1);
        const me = Date.UTC(anno, m + 1, 0);
        let disp = 0;
        let occ = 0;
        for (const u of brevi) {
            const s = Math.max(ms, inizioPossesso(u));
            const e = Math.min(me, dataVend(u)?.getTime() ?? Infinity);
            if (e < s) continue;
            disp += gg(s, e);
            for (const p of pren) {
                if (p.unitaId !== u.id) continue;
                const x = Math.max(p.checkIn.getTime(), s);
                const y = Math.min(p.checkOut.getTime(), e + GIORNO);
                occ += Math.max(0, Math.round((y - x) / GIORNO));
            }
        }
        const incasso = somma(
            movs.filter((x) => x.cat === "BREVI" && ids.has(x.unitaId) && x.data.getUTCFullYear() === anno && x.data.getUTCMonth() === m),
            (x) => x.importo
        );
        out.push({ mese: MESI[m], incasso: r2(incasso), occupazione: disp ? Math.round((occ / disp) * 1000) / 10 : null, notti: occ });
    }
    return out;
}

// debito residuo di tutti i finanziamenti, mese per mese: effettivo fino a oggi, previsto dopo
export async function serieDebito() {
    const finanz = await prisma.finanziamento.findMany();
    if (!finanz.length) return [];
    const oggi = new Date();
    const ini = new Date(Math.min(...finanz.map((f) => f.dataErogazione.getTime())));
    const fine = new Date(
        Math.max(
            ...finanz.map((f) => {
                const p = pianoFinanziamento(f);
                return p.length ? p[p.length - 1].data.getTime() : f.dataErogazione.getTime();
            })
        )
    );
    const chiave = (y, m) => y * 12 + m;
    const k0 = chiave(oggi.getUTCFullYear(), oggi.getUTCMonth());
    const kFine = chiave(fine.getUTCFullYear(), fine.getUTCMonth());

    const out = [];
    let y = ini.getUTCFullYear();
    let m = ini.getUTCMonth();
    while (chiave(y, m) <= kFine && out.length < 480) {
        const fineMese = new Date(Date.UTC(y, m + 1, 0));
        const debito = r2(somma(finanz, (f) => statoAlla(f, fineMese).debito));
        const k = chiave(y, m);
        out.push({
            label: `${String(m + 1).padStart(2, "0")}/${String(y).slice(2)}`,
            effettivo: k <= k0 ? debito : null,
            previsto: k >= k0 ? debito : null,
        });
        m++;
        if (m > 11) { m = 0; y++; }
    }
    return out;
}