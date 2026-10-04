import { prisma } from "@/lib/prisma";
import { fineEffettiva } from "./scadenze";

const d10 = (d) => (d ? d.toISOString().slice(0, 10) : null);

export async function datiForm(escludiId = null) {
    const palazzine = await prisma.palazzina.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } });

    const unitaDb = await prisma.unita.findMany({
        where: { dataVendita: null },
        include: { palazzina: true },
        orderBy: { nome: "asc" },
    });
    const unita = unitaDb.map((u) => ({
        id: u.id,
        nome: u.nome,
        palazzinaId: u.palazzinaId,
        palazzina: u.palazzina?.nome ?? null,
        affittoBreve: u.affittoBreve,
    }));

    const contrDb = await prisma.contratto.findMany({
        where: { tipo: "LUNGO" },
        include: { inquilino: true, unita: true },
    });
    const contratti = contrDb.map((c) => ({
        id: c.id,
        unitaId: c.unitaId,
        palazzinaId: c.unita.palazzinaId,
        unita: c.unita.nome,
        inquilino: c.inquilino.nome,
        persone: c.persone,
        inizio: d10(c.dataInizio),
        fine: d10(fineEffettiva(c)),
    }));

    // ultima lettura finale per unità e tipo, e per contatore generale della palazzina
    const escl = escludiId ? { bollettaId: { not: escludiId } } : {};
    const quote = await prisma.quota.findMany({
        where: { letturaFinale: { not: null }, ...escl },
        include: { contratto: { select: { unitaId: true } }, bolletta: { select: { tipo: true } } },
        orderBy: { bolletta: { al: "desc" } },
    });
    const perUnita = {};
    for (const q of quote) {
        const k = `${q.contratto.unitaId}:${q.bolletta.tipo}`;
        if (!(k in perUnita)) perUnita[k] = q.letturaFinale;
    }

    const gen = await prisma.bolletta.findMany({
        where: { letturaGenFinale: { not: null }, ...(escludiId ? { id: { not: escludiId } } : {}) },
        orderBy: { al: "desc" },
        select: { palazzinaId: true, tipo: true, letturaGenFinale: true },
    });
    const generali = {};
    for (const b of gen) {
        const k = `${b.palazzinaId}:${b.tipo}`;
        if (!(k in generali)) generali[k] = b.letturaGenFinale;
    }

    return { palazzine, unita, contratti, ultime: { unita: perUnita, generali } };
}