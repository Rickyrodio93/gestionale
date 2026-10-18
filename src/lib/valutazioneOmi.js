import { prisma } from "@/lib/prisma";
import { viaDi } from "@/lib/omiZona";
import { STATO_OMI } from "@/lib/condizioni";

// tipologie OMI preferite per un'unità, dalla categoria catastale (poi dal tipo di unità)
function preferenze(u) {
    const cat = (u.catasto?.categoria ?? "").toUpperCase();
    if (/^C\/6/.test(cat)) return [/box/i];
    if (/^C\/1/.test(cat)) return [/negozi/i];
    if (/^A\/10/.test(cat)) return [/uffici/i];
    if (/^A\/(7|8|9)/.test(cat)) return [/ville/i, /civili/i];
    if (/^A\/(3|4|5)/.test(cat)) return [/economico/i, /civili/i];
    if (/^A\//.test(cat)) return [/civili/i];
    if (u.tipo === "VILLA") return [/ville/i, /civili/i];
    if (u.tipo === "LAVANDERIA") return [/laboratori/i, /negozi/i];
    if (u.tipo === "CANTINA") return [/box/i];
    return [/civili/i];
}

function scegli(quote, prefs, statoVoluto) {
    for (const re of prefs) {
        const nome = quote.find((q) => re.test(q.tipologia))?.tipologia;
        if (!nome) continue;
        const tip = quote.filter((q) => q.tipologia === nome);
        return (
            tip.find((q) => q.stato.toUpperCase() === statoVoluto) ??
            tip.find((q) => /normale/i.test(q.stato)) ??
            tip[0]
        );
    }
    return null;
}

const somma = (a, f) => a.reduce((t, x) => t + f(x), 0);

// Valore teorico = superficie catastale × prezzo €/m² (min, max e medio) di zona, tipologia e stato.
export async function valutazioniOmi() {
    const unitaArgs = { where: { dataVendita: null }, include: { catasto: true }, orderBy: { nome: "asc" } };
    const palazzine = await prisma.palazzina.findMany({ where: { dataVendita: null }, include: { unita: unitaArgs }, orderBy: { nome: "asc" } });
    const autonome = await prisma.unita.findMany({ where: { palazzinaId: null, ...unitaArgs.where }, include: unitaArgs.include, orderBy: unitaArgs.orderBy });
    const tutte = await prisma.quotazioneOmi.findMany();
    const nZone = await prisma.zonaOmi.count();

    const semestri = {};
    for (const q of tutte) if (!semestri[q.comuneCat] || q.semestre > semestri[q.comuneCat]) semestri[q.comuneCat] = q.semestre;

    const riga = (u, pos) => {
        const cod = u.catasto?.codiceComune?.toUpperCase();
        const r = {
            id: u.id, nome: u.nome, condizioni: u.condizioni, zona: u.omiZona ?? null,
            superficie: u.catasto?.superficie ?? null,
            indirizzo: [viaDi(pos), pos.comune].filter(Boolean).join(", "),
            posTipo: pos === u ? "unita" : "palazzina", posId: pos.id, posOk: pos.lat != null,
            valido: false, problema: null,
        };
        if (!u.catasto) r.problema = "mancano i dati catastali";
        else if (!(r.superficie > 0)) r.problema = "manca la superficie catastale";
        else if (pos.lat == null) r.problema = viaDi(pos) && pos.comune ? "indirizzo non trovato: controlla via, civico e comune" : "manca l'indirizzo";
        else if (!nZone || !tutte.length) r.problema = "carica i file OMI qui sotto";
        else if (!u.omiZona) r.problema = "la posizione non cade in nessuna zona importata";
        else {
            const sem = semestri[cod];
            const quote = tutte.filter((q) => q.comuneCat === cod && q.semestre === sem && q.zona === u.omiZona);
            const statoVoluto = STATO_OMI[u.condizioni] ?? "NORMALE";
            const q = scegli(quote, preferenze(u), statoVoluto);
            if (!q) r.problema = `nessuna quotazione OMI per questo tipo di immobile nella zona ${u.omiZona}`;
            else {
                Object.assign(r, {
                    valido: true, semestre: sem, zonaDescr: q.zonaDescr, tipologia: q.tipologia, stato: q.stato,
                    statoVoluto, statoDiverso: q.stato.toUpperCase() !== statoVoluto, netta: q.superficie === "N",
                    minMq: q.min, maxMq: q.max,
                    min: r.superficie * q.min, max: r.superficie * q.max, med: (r.superficie * (q.min + q.max)) / 2,
                });
            }
        }
        return r;
    };

    const gruppi = [];
    for (const p of palazzine) {
        if (!p.unita.length) continue;
        gruppi.push({ tipo: "palazzina", id: p.id, posOk: p.lat != null, nome: p.nome, indirizzo: [viaDi(p), p.comune].filter(Boolean).join(", "), unita: p.unita.map((u) => riga(u, p)) });
    }
    if (autonome.length) gruppi.push({ tipo: "autonome", id: 0, nome: "Unità autonome", indirizzo: "", unita: autonome.map((u) => riga(u, u)) });

    for (const g of gruppi) {
        const ok = g.unita.filter((r) => r.valido);
        g.totale = { validi: ok.length, unita: g.unita.length, min: somma(ok, (r) => r.min), med: somma(ok, (r) => r.med), max: somma(ok, (r) => r.max) };
    }
    return { gruppi, semestri, nQuote: tutte.length, nZone };
}

// Scrive la stima di ogni unità tra i valori dell'immobile: gli investimenti la usano se manca una stima manuale.
export async function sincronizzaStimeOmi() {
    const { gruppi } = await valutazioniOmi();
    for (const g of gruppi)
        for (const r of g.unita) {
            if (!r.valido) continue;
            const fonte = `OMI ${r.semestre} zona ${r.zona}, ${r.tipologia}, ${r.stato}: ${r.minMq}–${r.maxMq} €/m² × ${r.superficie} m² (Agenzia Entrate - OMI)`;
            await prisma.$transaction([
                // una sola stima per semestre: risalvando si sostituisce
                prisma.valoreImmobile.deleteMany({ where: { unitaId: r.id, tipo: "OMI", fonte: { startsWith: `OMI ${r.semestre}` } } }),
                prisma.valoreImmobile.create({
                    data: { unitaId: r.id, tipo: "OMI", data: new Date(), importo: Math.round(r.med), fonte, note: `Intervallo ${Math.round(r.min)}–${Math.round(r.max)} €` },
                }),
                prisma.unita.update({ where: { id: r.id }, data: { omiTipologia: r.tipologia, omiStato: r.stato } }),
            ]);
        }
}