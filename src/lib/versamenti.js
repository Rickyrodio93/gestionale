import { prisma } from "@/lib/prisma";
import { situazioneCanoni } from "@/lib/canoni";

const r2 = (n) => Math.round(n * 100) / 100;
const somma = (a) => a.reduce((t, x) => t + x, 0);

export const CONTRATTI_INCLUDE = {
    canoni: true,
    unita: { include: { palazzina: true } },
    quote: { include: { bolletta: true, pagamenti: true } },
    addebiti: { include: { pagamenti: true } },
};

// ricalcola da zero le attribuzioni dei versamenti; i pagamenti inseriti a mano non si toccano
export async function riallocaVersamenti(inquilinoId) {
    await prisma.$transaction([
        prisma.pagamentoCanone.deleteMany({ where: { versamento: { inquilinoId } } }),
        prisma.pagamento.deleteMany({ where: { versamento: { inquilinoId } } }),
        prisma.pagamentoAddebito.deleteMany({ where: { versamento: { inquilinoId } } }),
    ]);

    const versamenti = await prisma.versamento.findMany({
        where: { inquilinoId },
        orderBy: [{ data: "asc" }, { id: "asc" }],
    });
    if (!versamenti.length) return;

    const contratti = await prisma.contratto.findMany({
        where: { inquilinoId, tipo: "LUNGO" },
        include: CONTRATTI_INCLUDE,
    });

    // debiti aperti (i canoni solo fino al mese in corso)
    const voci = [];
    for (const c of contratti) {
        const sc = situazioneCanoni(c);
        for (const r of sc.righe)
            if (r.residuo > 0.005 && r.mese <= sc.corrente)
                voci.push({ k: "canone", gruppo: "canoni", unitaId: c.unitaId, contrattoId: c.id, mese: r.mese, data: r.dal ?? new Date(`${r.mese}-01`), residuo: r.residuo });
        for (const q of c.quote) {
            const res = r2(q.importo - somma(q.pagamenti.map((p) => p.importo)));
            if (res > 0.005) voci.push({ k: "quota", gruppo: "spese", unitaId: c.unitaId, quotaId: q.id, data: q.bolletta.al, residuo: res });
        }
        for (const a of c.addebiti) {
            const res = r2(a.importo - somma(a.pagamenti.map((p) => p.importo)));
            if (res > 0.005) voci.push({ k: "addebito", gruppo: "spese", unitaId: c.unitaId, addebitoId: a.id, data: a.data, residuo: res });
        }
    }
    voci.sort((a, b) => a.data - b.data);

    const nCanoni = [];
    const nQuote = [];
    const nAdd = [];

    for (const v of versamenti) {
        let resto = v.importo;
        const ammesse = voci.filter(
            (x) =>
                x.residuo > 0.005 &&
                (!v.unitaId || x.unitaId === v.unitaId) &&
                (v.destinazione === "AUTO" || (v.destinazione === "CANONI" ? x.gruppo === "canoni" : x.gruppo === "spese"))
        );
        for (const x of ammesse) {
            if (resto <= 0.005) break;
            const q = r2(Math.min(resto, x.residuo));
            x.residuo = r2(x.residuo - q);
            resto = r2(resto - q);
            if (x.k === "canone")
                nCanoni.push({ contrattoId: x.contrattoId, mese: x.mese, data: v.data, importo: q, note: "Da versamento", versamentoId: v.id });
            else if (x.k === "quota") nQuote.push({ quotaId: x.quotaId, data: v.data, importo: q, versamentoId: v.id });
            else nAdd.push({ addebitoId: x.addebitoId, data: v.data, importo: q, versamentoId: v.id });
        }
    }

    await prisma.$transaction([
        prisma.pagamentoCanone.createMany({ data: nCanoni }),
        prisma.pagamento.createMany({ data: nQuote }),
        prisma.pagamentoAddebito.createMany({ data: nAdd }),
    ]);
}