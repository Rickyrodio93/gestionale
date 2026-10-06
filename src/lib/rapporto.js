import { prisma } from "@/lib/prisma";
import { etichettaPeriodo, situazioneCanoni } from "@/lib/canoni";
import { CONTRATTI_INCLUDE } from "@/lib/versamenti";
import { TIPI } from "@/lib/bollette";
import { dataIt } from "@/lib/format";

const r2 = (n) => Math.round(n * 100) / 100;
const somma = (a) => a.reduce((t, x) => t + x, 0);
const gen = (arr) => somma(arr.filter((p) => p.versamentoId).map((p) => p.importo));
const man = (arr) => somma(arr.filter((p) => !p.versamentoId).map((p) => p.importo));

export async function costruisciRapporto(inquilinoId) {
    const inquilino = await prisma.inquilino.findUnique({ where: { id: inquilinoId } });
    if (!inquilino) return null;

    const contratti = await prisma.contratto.findMany({
        where: { inquilinoId, tipo: "LUNGO" },
        include: { ...CONTRATTI_INCLUDE, trattenute: true },
        orderBy: { dataInizio: "asc" },
    });
    const versamentiDb = await prisma.versamento.findMany({
        where: { inquilinoId },
        orderBy: [{ data: "desc" }, { id: "desc" }],
        include: { canoni: true, pagamenti: true, pagAddebiti: true },
    });

    const canoni = [];
    const spese = [];
    for (const c of contratti) {
        const sc = situazioneCanoni(c);
        for (const r of sc.righe) {
            if (r.mese > sc.corrente) continue;
            const g = gen(c.canoni.filter((p) => p.mese === r.mese));
            const dovuto = r2(r.atteso - (r.incassato - g)); // al netto dei pagamenti diretti
            if (dovuto <= 0.005) continue;
            canoni.push({ mese: r.mese, periodo: etichettaPeriodo(r, sc.step), unita: c.unita.nome, dovuto, coperto: r2(g), residuo: r2(dovuto - g) });
        }
        for (const q of c.quote) {
            const dovuto = r2(q.importo - man(q.pagamenti));
            if (dovuto <= 0.005) continue;
            const g = gen(q.pagamenti);
            spese.push({
                data: q.bolletta.al,
                descr: `${TIPI[q.bolletta.tipo]} ${dataIt(q.bolletta.dal)} → ${dataIt(q.bolletta.al)}`,
                unita: c.unita.nome, dovuto, coperto: r2(g), residuo: r2(dovuto - g),
                href: `/spese/bollette/${q.bollettaId}`,
            });
        }
        for (const a of c.addebiti) {
            const dovuto = r2(a.importo - man(a.pagamenti));
            if (dovuto <= 0.005) continue;
            const g = gen(a.pagamenti);
            spese.push({ data: a.data, descr: a.descrizione, unita: c.unita.nome, dovuto, coperto: r2(g), residuo: r2(dovuto - g) });
        }
    }
    canoni.sort((a, b) => (a.mese < b.mese ? -1 : 1));
    spese.sort((a, b) => a.data - b.data);

    const tot = (a) => ({
        dovuto: r2(somma(a.map((x) => x.dovuto))),
        coperto: r2(somma(a.map((x) => x.coperto))),
        residuo: r2(somma(a.map((x) => x.residuo))),
    });
    const alloc = (v) => r2(somma([...v.canoni, ...v.pagamenti, ...v.pagAddebiti].map((p) => p.importo)));
    const versamenti = versamentiDb.map((v) => ({ ...v, allocato: alloc(v), credito: r2(v.importo - alloc(v)) }));
    const credito = r2(somma(versamenti.map((v) => v.credito)));

    const diretti = contratti.flatMap((c) =>
        c.canoni.filter((p) => !p.versamentoId).map((p) => ({ data: p.data, importo: p.importo, descr: `Canone ${p.mese}` }))
    );
    const ultimo =
        [...versamentiDb.map((v) => ({ data: v.data, importo: v.importo, descr: "Versamento" })), ...diretti]
            .sort((a, b) => b.data - a.data)[0] ?? null;

    const totCanoni = tot(canoni);
    const totSpese = tot(spese);
    const residuo = r2(totCanoni.residuo + totSpese.residuo - credito);

    // cauzione: detenuta = versata e non ancora liquidata
    const aperte = contratti.filter((c) => c.cauzione && c.cauzioneVersataIl && !c.cauzioneRestituitaIl);
    const detenuta = r2(somma(aperte.map((c) => c.cauzione)));
    const trattenute = r2(somma(aperte.flatMap((c) => c.trattenute.map((t) => t.importo))));
    const daVersare = r2(
        somma(contratti.filter((c) => c.cauzione && !c.cauzioneVersataIl && !c.cauzioneRestituitaIl).map((c) => c.cauzione))
    );
    const liquidate = contratti
        .filter((c) => c.cauzione != null && c.cauzioneRestituitaIl)
        .map((c) => ({
            unita: c.unita.nome,
            data: c.cauzioneRestituitaIl,
            cauzione: c.cauzione,
            restituito: c.cauzioneRestituita ?? 0,
            trattenuto: r2(c.cauzione - (c.cauzioneRestituita ?? 0)),
        }));

    return {
        inquilino, contratti, canoni, spese, totCanoni, totSpese, versamenti, credito, ultimo, residuo,
        versatoTot: r2(somma(versamentiDb.map((v) => v.importo))),
        cauzione: {
            detenuta, trattenute, daVersare, liquidate,
            saldo: r2(residuo + trattenute - detenuta), // > 0: ancora da incassare; <= 0: da restituire
        },
    };
}