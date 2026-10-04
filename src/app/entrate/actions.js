"use server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { fineContratto, rinnovaFine } from "@/lib/scadenze";
import { situazioneCanoni } from "@/lib/canoni";

const str = (v) => v?.toString().trim() || null;
const num = (v) => (v == null || String(v).trim() === "" ? null : Number(String(v).replace(",", ".")));

async function leggiContratto(fd) {
    if (!fd.get("dataInizio")) return { error: "Inserisci la data di inizio." };
    const dataInizio = new Date(fd.get("dataInizio"));
    const durataMesi = num(fd.get("durataMesi"));
    if (!durataMesi) return { error: "Inserisci la durata in mesi." };

    const dataFine = fd.get("dataFine") ? new Date(fd.get("dataFine")) : fineContratto(dataInizio, durataMesi);
    if (dataFine <= dataInizio) return { error: "La data di fine deve essere successiva all'inizio." };

    let inquilinoId;
    if (fd.get("inquilinoId") === "nuovo") {
        const nome = str(fd.get("nome"));
        if (!nome) return { error: "Inserisci il nome dell'inquilino." };
        const i = await prisma.inquilino.create({
            data: {
                nome,
                tipo: fd.get("tipoInquilino") || "PERSONA",
                email: str(fd.get("email")),
                telefono: str(fd.get("telefono")),
                cfPiva: str(fd.get("cfPiva")),
            },
        });
        inquilinoId = i.id;
    } else {
        inquilinoId = Number(fd.get("inquilinoId"));
    }

    return {
        dati: {
            inquilinoId,
            tipo: "LUNGO",
            modalita: fd.get("modalita"),
            dataInizio,
            dataFine,
            durataMesi,
            rinnovoMesi: num(fd.get("rinnovoMesi")),
            preavvisoMesi: num(fd.get("preavvisoMesi")) ?? 6,
            canone: num(fd.get("canone")),
            persone: num(fd.get("persone")),
            cedolare: fd.get("cedolare") === "on",
        },
    };
}

function aggiorna(id) {
    revalidatePath("/entrate");
    revalidatePath("/appartamenti");
    revalidatePath(`/entrate/contratti/${id}`);
}

export async function creaContratto(_prev, fd) {
    const unitaId = Number(fd.get("unitaId"));
    const unita = await prisma.unita.findUnique({ where: { id: unitaId }, include: { catasto: true } });
    if (!unita) return { error: "Scegli un'unità." };
    if (!unita.catasto)
        return { error: `Completa prima i dati catastali di "${unita.nome}" (Appartamenti → Modifica).` };

    const r = await leggiContratto(fd);
    if (r.error) return r;
    const c = await prisma.contratto.create({ data: { ...r.dati, unitaId } });
    aggiorna(c.id);
    redirect(`/entrate/contratti/${c.id}`);
}

export async function aggiornaContratto(id, _prev, fd) {
    const r = await leggiContratto(fd);
    if (r.error) return r;
    await prisma.contratto.update({ where: { id }, data: r.dati });
    aggiorna(id);
    redirect(`/entrate/contratti/${id}`);
}

export async function eliminaContratto(id) {
    // con quote di bollette collegate non si elimina, per non perdere lo storico
    const n =
        (await prisma.quota.count({ where: { contrattoId: id } })) +
        (await prisma.pagamentoCanone.count({ where: { contrattoId: id } }));
    if (n > 0) return;
    await prisma.contratto.delete({ where: { id } });
    aggiorna(id);
    redirect("/entrate");
}

export async function segnaDisdetta(id, fd) {
    const data = fd.get("data");
    if (!data) return;
    await prisma.contratto.update({
        where: { id },
        data: { disdettaInviataIl: new Date(data), disdettaNote: str(fd.get("note")) },
    });
    aggiorna(id);
}

export async function annullaDisdetta(id) {
    await prisma.contratto.update({ where: { id }, data: { disdettaInviataIl: null, disdettaNote: null } });
    aggiorna(id);
}

export async function rinnovaContratto(id) {
    const c = await prisma.contratto.findUnique({ where: { id } });
    if (!c?.dataFine || !c.rinnovoMesi) return;
    await prisma.contratto.update({
        where: { id },
        data: {
            dataFine: rinnovaFine(c.dataFine, c.rinnovoMesi),
            rinnovi: c.rinnovi + 1,
            disdettaInviataIl: null,
            disdettaNote: null,
            inOccupazione: false,
            dataRilascio: null,
        },
    });
    aggiorna(id);
}

function leggiIncasso(fd) {
    const unitaId = Number(fd.get("unitaId"));
    const importo = num(fd.get("importo"));
    const data = fd.get("data");
    const mese = fd.get("mese");
    if (!unitaId || importo == null || !data || !mese)
        return { error: "Compila unità, mese di competenza, data di accredito e importo." };
    return { dati: { unitaId, importo, data: new Date(data), mese, note: str(fd.get("note")) } };
}

export async function creaIncasso(_prev, fd) {
    const r = leggiIncasso(fd);
    if (r.error) return r;
    await prisma.incasso.create({ data: r.dati });
    revalidatePath("/entrate");
    redirect("/entrate?anno=tutti");
}

export async function aggiornaIncasso(id, _prev, fd) {
    const r = leggiIncasso(fd);
    if (r.error) return r;
    await prisma.incasso.update({ where: { id }, data: r.dati });
    revalidatePath("/entrate");
    redirect("/entrate?anno=tutti");
}

export async function eliminaIncasso(id) {
    await prisma.incasso.delete({ where: { id } });
    revalidatePath("/entrate");
}

// ---- occupazione e rilascio ----
export async function segnaOccupazione(id) {
    await prisma.contratto.update({ where: { id }, data: { inOccupazione: true } });
    aggiorna(id);
}
export async function annullaOccupazione(id) {
    await prisma.contratto.update({ where: { id }, data: { inOccupazione: false } });
    aggiorna(id);
}
export async function segnaRilascio(id, fd) {
    if (!fd.get("data")) return;
    await prisma.contratto.update({
        where: { id },
        data: { dataRilascio: new Date(fd.get("data")), inOccupazione: false },
    });
    aggiorna(id);
}
export async function annullaRilascio(id) {
    await prisma.contratto.update({ where: { id }, data: { dataRilascio: null } });
    aggiorna(id);
}

// ---- canoni incassati ----
function leggiCanone(fd) {
    const mese = fd.get("mese");
    const importo = num(fd.get("importo"));
    const data = fd.get("data");
    if (!mese || importo == null || !data) return null;
    return { mese, importo, data: new Date(data), note: str(fd.get("note")) };
}

export async function registraCanone(contrattoId, fd) {
    const d = leggiCanone(fd);
    if (!d) return;
    await prisma.pagamentoCanone.create({ data: { ...d, contrattoId } });
    aggiorna(contrattoId);
}
export async function aggiornaCanone(id, contrattoId, fd) {
    const d = leggiCanone(fd);
    if (!d) return;
    await prisma.pagamentoCanone.update({ where: { id }, data: d });
    aggiorna(contrattoId);
}
export async function eliminaCanone(id, contrattoId) {
    await prisma.pagamentoCanone.delete({ where: { id } });
    aggiorna(contrattoId);
}

// segna come incassati i mesi passati ancora aperti (data = primo del mese, poi modificabile)
export async function incassaMesiMancanti(contrattoId) {
    const c = await prisma.contratto.findUnique({
        where: { id: contrattoId },
        include: { canoni: true, unita: { include: { palazzina: true } } },
    });
    if (!c) return;
    const sc = situazioneCanoni(c);
    const da = sc.righe.filter((r) => r.mese < sc.corrente && r.residuo > 0.005);
    if (!da.length) return;
    await prisma.pagamentoCanone.createMany({
        data: da.map((r) => ({ contrattoId, mese: r.mese, data: new Date(`${r.mese}-01`), importo: r.residuo })),
    });
    aggiorna(contrattoId);
}