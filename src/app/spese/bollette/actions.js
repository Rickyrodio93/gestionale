"use server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ripartisci } from "@/lib/bollette";

const str = (v) => v?.toString().trim() || null;
const num = (v) => (v == null || String(v).trim() === "" ? null : Number(String(v).replace(",", ".")));

const rev = (id) => {
    revalidatePath("/spese/bollette");
    if (id) revalidatePath(`/spese/bollette/${id}`);
};

async function leggi(fd) {
    const [tipoD, idStr] = String(fd.get("destinazione") || "").split(":");
    const id = Number(idStr);
    if (!["palazzina", "unita"].includes(tipoD) || !id) return { error: "Scegli a cosa si riferisce la bolletta." };

    const importo = num(fd.get("importo"));
    if (importo == null || !fd.get("dal") || !fd.get("al")) return { error: "Compila periodo e importo." };
    const dal = new Date(fd.get("dal"));
    const al = new Date(fd.get("al"));
    if (al < dal) return { error: "La data finale è precedente a quella iniziale." };

    const metodo = fd.get("metodo");
    const dati = {
        palazzinaId: tipoD === "palazzina" ? id : null,
        unitaId: tipoD === "unita" ? id : null,
        tipo: fd.get("tipo"),
        numero: str(fd.get("numero")),
        fornitore: str(fd.get("fornitore")),
        dal,
        al,
        importo,
        metodo,
        dataPagamento: fd.get("dataPagamento") ? new Date(fd.get("dataPagamento")) : null,
        note: str(fd.get("note")),
        letturaGenIniziale: null,
        letturaGenFinale: null,
    };

    let quote = [];
    if (metodo !== "A_CARICO") {
        const ids = [...fd.keys()].filter((k) => /^r\d+_inc$/.test(k)).map((k) => Number(k.slice(1, -4)));
        const trovati = await prisma.contratto.count({ where: { id: { in: ids } } });
        if (trovati !== ids.length) return { error: "Uno dei contratti selezionati non esiste più." };

        const righe = ids.map((cid) => {
            const li = num(fd.get(`r${cid}_li`));
            const lf = num(fd.get(`r${cid}_lf`));
            return {
                contrattoId: cid,
                persone: num(fd.get(`r${cid}_persone`)),
                li,
                lf,
                consumo: li != null && lf != null ? lf - li : null,
            };
        });

        let consumoGenerale = null;
        if (metodo === "CONSUMO" && tipoD === "palazzina") {
            const gi = num(fd.get("genLi"));
            const gf = num(fd.get("genLf"));
            dati.letturaGenIniziale = gi;
            dati.letturaGenFinale = gf;
            if (gi != null && gf != null) consumoGenerale = gf - gi;
        }

        const r = ripartisci({ metodo, importo, righe, consumoGenerale });
        if (r.error) return r;

        quote = r.quote.map((q, i) => ({
            ...q,
            persone: metodo === "PERSONE" && righe[i].persone != null ? Math.round(righe[i].persone) : null,
            letturaIniziale: metodo === "CONSUMO" ? righe[i].li : null,
            letturaFinale: metodo === "CONSUMO" ? righe[i].lf : null,
            consumo: metodo === "CONSUMO" ? righe[i].consumo : null,
        }));
    }
    return { dati, quote };
}

export async function creaBolletta(_prev, fd) {
    const r = await leggi(fd);
    if (r.error) return r;
    const b = await prisma.bolletta.create({ data: { ...r.dati, quote: { create: r.quote } } });
    rev();
    redirect(`/spese/bollette/${b.id}`);
}

export async function aggiornaBolletta(id, _prev, fd) {
    const r = await leggi(fd);
    if (r.error) return r;

    // le quote esistenti si aggiornano (non si ricreano), per non perdere i pagamenti
    const esist = await prisma.quota.findMany({
        where: { bollettaId: id },
        include: { _count: { select: { pagamenti: true } } },
    });
    const nuovi = new Set(r.quote.map((q) => q.contrattoId));
    const daRimuovere = esist.filter((q) => !nuovi.has(q.contrattoId));
    if (daRimuovere.some((q) => q._count.pagamenti > 0))
        return { error: "Una quota che vuoi togliere ha già pagamenti: eliminali prima dalla scheda della bolletta." };

    await prisma.$transaction([
        prisma.bolletta.update({ where: { id }, data: r.dati }),
        ...daRimuovere.map((q) => prisma.quota.delete({ where: { id: q.id } })),
        ...r.quote.map((q) => {
            const e = esist.find((x) => x.contrattoId === q.contrattoId);
            return e
                ? prisma.quota.update({ where: { id: e.id }, data: q })
                : prisma.quota.create({ data: { ...q, bollettaId: id } });
        }),
    ]);
    rev(id);
    redirect(`/spese/bollette/${id}`);
}

export async function eliminaBolletta(id) {
    await prisma.bolletta.delete({ where: { id } }); // quote e pagamenti seguono a cascata
    rev();
    redirect("/spese/bollette");
}

export async function aggiungiPagamento(quotaId, bollettaId, fd) {
    const importo = num(fd.get("importo"));
    const data = fd.get("data");
    if (!importo || !data) return;
    await prisma.pagamento.create({ data: { quotaId, importo, data: new Date(data) } });
    rev(bollettaId);
}

export async function aggiornaPagamento(id, bollettaId, fd) {
    const importo = num(fd.get("importo"));
    const data = fd.get("data");
    if (!importo || !data) return;
    await prisma.pagamento.update({ where: { id }, data: { importo, data: new Date(data) } });
    rev(bollettaId);
}

export async function eliminaPagamento(id, bollettaId) {
    await prisma.pagamento.delete({ where: { id } });
    rev(bollettaId);
}