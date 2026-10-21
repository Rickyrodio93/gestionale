"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const str = (v) => v?.toString().trim() || null;
const num = (v) => (v == null || String(v).trim() === "" ? null : Number(String(v).replace(",", ".")));

function rev(id) {
    revalidatePath(`/entrate/contratti/${id}`);
    revalidatePath("/entrate/inquilini/[id]", "page");
    revalidatePath("/entrate");
}

// con la cauzione liquidata gli interessi sono già stati riconosciuti: per cambiarli si annulla prima la liquidazione
async function aperta(contrattoId) {
    const c = await prisma.contratto.findUnique({ where: { id: contrattoId }, select: { cauzioneRestituitaIl: true } });
    return !!c && !c.cauzioneRestituitaIl;
}

function leggi(fd) {
    const importo = num(fd.get("importo"));
    if (!importo || importo <= 0 || !fd.get("data")) return null;
    return { data: new Date(fd.get("data")), importo, note: str(fd.get("note")) };
}

export async function registraInteresse(contrattoId, fd) {
    const d = leggi(fd);
    if (!d || !(await aperta(contrattoId))) return;
    await prisma.pagamentoInteresse.create({ data: { ...d, contrattoId } });
    rev(contrattoId);
}

export async function aggiornaInteresse(id, contrattoId, fd) {
    const d = leggi(fd);
    if (!d || !(await aperta(contrattoId))) return;
    await prisma.pagamentoInteresse.update({ where: { id }, data: d });
    rev(contrattoId);
}

export async function eliminaInteresse(id, contrattoId) {
    if (!(await aperta(contrattoId))) return;
    await prisma.pagamentoInteresse.delete({ where: { id } });
    rev(contrattoId);
}

// tasso personalizzato (es. fissato nel contratto): vuoto = tasso legale dell'anno
export async function impostaTassoCauzione(contrattoId, fd) {
    if (!(await aperta(contrattoId))) return;
    const t = num(fd.get("tasso"));
    if (t != null && (t < 0 || t > 20)) return;
    await prisma.contratto.update({ where: { id: contrattoId }, data: { tassoCauzione: t } });
    rev(contrattoId);
}