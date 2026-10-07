import { prisma } from "@/lib/prisma";
import { mesiAttesi } from "@/lib/canoni";

const GIORNO = 86400000;
const r2 = (n) => Math.round(n * 100) / 100;
const giorni = (a, b) => Math.round((b - a) / GIORNO) + 1; // estremi inclusi

export const ALIQUOTA_BASE = 21;
export const SOGLIA_ACCONTO = 257.52;

// canone di competenza dell'anno: parte in contratto e parte di occupazione oltre la scadenza
function competenzaAnno(c, anno, fino, daTs) {
    const inizioAnno = Math.max(Date.UTC(anno, 0, 1), daTs ?? -Infinity);
    const fineAnno = Math.min(Date.UTC(anno, 11, 31), fino ?? Infinity);
    if (fineAnno < inizioAnno) return { contratto: 0, occupazione: 0 };
    const fineContratto = Math.min(c.dataFine?.getTime() ?? Infinity, c.dataRilascio?.getTime() ?? Infinity);
    let contratto = 0;
    let occupazione = 0;

    for (const r of mesiAttesi(c, new Date(fineAnno))) {
        if (!r.da || !r.a) continue;
        const da = Math.max(r.da.getTime(), inizioAnno);
        const a = Math.min(r.a.getTime(), fineAnno);
        if (a < da) continue;
        const tot = giorni(r.da.getTime(), r.a.getTime());
        const gg = giorni(da, a);
        const fc = Math.min(a, fineContratto);
        const ggC = fc >= da ? giorni(da, fc) : 0;
        contratto += (r.atteso * ggC) / tot;
        occupazione += (r.atteso * (gg - ggC)) / tot;
    }
    return { contratto, occupazione };
}

// imposta per contratto; fino/da sono timestamp opzionali che limitano il periodo
export async function impostaContratti(anno, { fino, da } = {}) {
    const contratti = await prisma.contratto.findMany({
        where: { tipo: "LUNGO", cedolare: true, canone: { not: null } },
        include: { unita: { include: { palazzina: true } }, inquilino: true },
    });
    const righe = [];
    for (const c of contratti) {
        const { contratto, occupazione } = competenzaAnno(c, anno, fino, da);
        if (contratto < 0.005 && occupazione < 0.005) continue;
        const aliquota = c.aliquotaCedolare ?? ALIQUOTA_BASE;
        righe.push({
            id: c.id,
            unitaId: c.unitaId,
            palazzinaId: c.unita.palazzinaId,
            unita: c.unita.nome,
            inquilino: c.inquilino.nome,
            aliquota,
            base: r2(contratto),
            occupazione: r2(occupazione),
            imposta: r2((contratto * aliquota) / 100),
        });
    }
    return righe;
}

export async function stimaCedolare(anno, opzioni = {}) {
    const righe = await impostaContratti(anno, opzioni);
    const somma = (k) => r2(righe.reduce((t, x) => t + x[k], 0));

    // versamenti diretti: quelli delle rate contano tramite la dilazione che le copre
    const agg = await prisma.spesa.aggregate({ where: { categoria: "CEDOLARE", anno, rataId: null }, _sum: { importo: true } });
    const dil = await prisma.dilazioneImposta.aggregate({ where: { anno }, _sum: { impostaOriginaria: true } });
    const versato = r2(agg._sum.importo ?? 0);
    const dilazionata = r2(dil._sum.impostaOriginaria ?? 0);
    const imposta = somma("imposta");
    return {
        anno, righe, base: somma("base"), occupazione: somma("occupazione"),
        imposta, versato, dilazionata, residuo: r2(imposta - versato - dilazionata),
    };
}

// piano dei versamenti dell'anno: acconti (metodo storico) e saldo
export async function pianoCedolare(anno) {
    const [corr, prec] = await Promise.all([stimaCedolare(anno), stimaCedolare(anno - 1)]);
    const acconto = prec.imposta;
    const unica = acconto > 0 && acconto < SOGLIA_ACCONTO;
    const d = (y, m, g) => new Date(Date.UTC(y, m, g));

    const rate = [];
    if (acconto > 0 && unica) {
        rate.push({ id: "acc", titolo: "Acconto in unica rata", scadenza: d(anno, 10, 30), codice: "1841", importo: acconto });
    } else if (acconto > 0) {
        const r1 = r2(acconto * 0.4);
        rate.push({ id: "acc1", titolo: "Acconto, 1ª rata (40%)", scadenza: d(anno, 5, 30), codice: "1840", importo: r1 });
        rate.push({ id: "acc2", titolo: "Acconto, 2ª rata (60%)", scadenza: d(anno, 10, 30), codice: "1841", importo: r2(acconto - r1) });
    }
    const saldo = r2(corr.imposta - acconto); // negativo = credito
    rate.push({ id: "saldo", titolo: saldo < 0 ? "Saldo (a credito)" : "Saldo", scadenza: d(anno + 1, 5, 30), codice: "1842", importo: saldo });

    return { ...corr, acconto, rate, primoAnno: prec.imposta === 0 };
}

export async function dilazioni() {
    const lista = await prisma.dilazioneImposta.findMany({
        include: { rate: { orderBy: { scadenza: "asc" } } },
        orderBy: [{ anno: "desc" }, { id: "desc" }],
    });
    return lista.map((d) => {
        const totale = r2(d.rate.reduce((t, r) => t + r.importo, 0));
        const pagato = r2(d.rate.filter((r) => r.pagataIl).reduce((t, r) => t + r.importo, 0));
        return { ...d, totale, pagato, residuo: r2(totale - pagato), extra: r2(totale - d.impostaOriginaria) };
    });
}

// quota di interessi e sanzioni contenuta nelle rate pagate nel periodo (ripartita in proporzione)
export async function interessiPagati(anno, fino) {
    const da = new Date(Date.UTC(anno, 0, 1));
    const a = new Date(fino ?? Date.UTC(anno, 11, 31));
    let tot = 0;
    for (const d of await dilazioni()) {
        if (d.totale <= 0 || d.extra <= 0) continue;
        const quota = d.extra / d.totale;
        for (const r of d.rate) if (r.pagataIl && r.pagataIl >= da && r.pagataIl <= a) tot += r.importo * quota;
    }
    return r2(tot);
}