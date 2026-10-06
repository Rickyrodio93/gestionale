"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { riallocaVersamenti } from "@/lib/versamenti";

const str = (v) => v?.toString().trim() || null;
const num = (v) => (v == null || String(v).trim() === "" ? null : Number(String(v).replace(",", ".")));

function rev(inquilinoId) {
    revalidatePath(`/entrate/inquilini/${inquilinoId}`);
    revalidatePath("/entrate");
    revalidatePath("/entrate/contratti/[id]", "page");
    revalidatePath("/spese/bollette");
    revalidatePath("/spese/bollette/[id]", "page");
    revalidatePath("/");
}

function leggiVersamento(fd) {
    const importo = num(fd.get("importo"));
    if (!importo || importo <= 0 || !fd.get("data")) return null;
    return {
        data: new Date(fd.get("data")),
        importo,
        destinazione: fd.get("destinazione") || "AUTO",
        unitaId: num(fd.get("unitaId")) || null,
        note: str(fd.get("note")),
    };
}

export async function registraVersamento(inquilinoId, fd) {
    const d = leggiVersamento(fd);
    if (!d) return;
    await prisma.versamento.create({ data: { ...d, inquilinoId } });
    await riallocaVersamenti(inquilinoId);
    rev(inquilinoId);
}

export async function aggiornaVersamento(id, inquilinoId, fd) {
    const d = leggiVersamento(fd);
    if (!d) return;
    await prisma.versamento.update({ where: { id }, data: d });
    await riallocaVersamenti(inquilinoId);
    rev(inquilinoId);
}

export async function eliminaVersamento(id, inquilinoId) {
    await prisma.versamento.delete({ where: { id } }); // i pagamenti generati seguono a cascata
    await riallocaVersamenti(inquilinoId);
    rev(inquilinoId);
}

function leggiAddebito(fd) {
    const descrizione = str(fd.get("descrizione"));
    const importo = num(fd.get("importo"));
    if (!descrizione || !importo || importo <= 0 || !fd.get("data")) return null;
    return { descrizione, importo, data: new Date(fd.get("data")) };
}

export async function aggiungiAddebito(inquilinoId, fd) {
    const d = leggiAddebito(fd);
    const contrattoId = Number(fd.get("contrattoId"));
    if (!d || !contrattoId) return;
    const c = await prisma.contratto.findFirst({ where: { id: contrattoId, inquilinoId } });
    if (!c) return;
    await prisma.addebito.create({ data: { ...d, contrattoId } });
    await riallocaVersamenti(inquilinoId);
    rev(inquilinoId);
}

export async function aggiornaAddebito(id, inquilinoId, fd) {
    const d = leggiAddebito(fd);
    if (!d) return;
    await prisma.addebito.update({ where: { id }, data: d });
    await riallocaVersamenti(inquilinoId);
    rev(inquilinoId);
}

export async function eliminaAddebito(id, inquilinoId) {
    await prisma.addebito.delete({ where: { id } });
    await riallocaVersamenti(inquilinoId);
    rev(inquilinoId);
}

export async function riallocaOra(inquilinoId) {
    await riallocaVersamenti(inquilinoId);
    rev(inquilinoId);
}