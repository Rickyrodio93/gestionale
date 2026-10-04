"use server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const str = (v) => v?.toString().trim() || null;
const num = (v) => (v == null || String(v).trim() === "" ? null : Number(String(v).replace(",", ".")));
const dt = (fd, k) => (fd.get(k) ? new Date(fd.get(k)) : null);

function rev(tipo, id) {
    ["/investimenti", `/investimenti/${tipo}/${id}`, "/appartamenti", "/entrate"].forEach((p) => revalidatePath(p));
}

export async function salvaAcquistoVendita(tipo, id, _prev, fd) {
    const dati = {
        dataAcquisto: dt(fd, "dataAcquisto"),
        prezzoAcquisto: num(fd.get("prezzoAcquisto")),
        costiAcquisto: num(fd.get("costiAcquisto")),
        dataVendita: dt(fd, "dataVendita"),
        prezzoVendita: num(fd.get("prezzoVendita")),
        costiVendita: num(fd.get("costiVendita")),
    };
    if (dati.dataVendita && dati.prezzoVendita == null) return { error: "Per registrare la vendita indica anche il prezzo." };
    if (dati.dataVendita && dati.dataAcquisto && dati.dataVendita < dati.dataAcquisto)
        return { error: "La data di vendita è precedente a quella di acquisto." };

    if (tipo === "palazzina") {
        const prima = await prisma.palazzina.findUnique({ where: { id } });
        await prisma.palazzina.update({ where: { id }, data: dati });
        // la vendita della palazzina si riflette su tutte le sue unità
        if (dati.dataVendita) {
            await prisma.unita.updateMany({
                where: { palazzinaId: id, OR: [{ dataVendita: null }, ...(prima.dataVendita ? [{ dataVendita: prima.dataVendita }] : [])] },
                data: { dataVendita: dati.dataVendita },
            });
        } else if (prima.dataVendita) {
            await prisma.unita.updateMany({ where: { palazzinaId: id, dataVendita: prima.dataVendita }, data: { dataVendita: null } });
        }
    } else {
        await prisma.unita.update({ where: { id }, data: dati });
    }
    rev(tipo, id);
    redirect("/investimenti");
}

function leggiStima(fd) {
    const importo = num(fd.get("importo"));
    const data = dt(fd, "data");
    if (!importo || !data) return null;
    return { tipo: fd.get("tipo"), data, importo, fonte: str(fd.get("fonte")) };
}

export async function aggiungiStima(tipo, id, fd) {
    const d = leggiStima(fd);
    if (!d) return;
    await prisma.valoreImmobile.create({ data: { ...d, ...(tipo === "palazzina" ? { palazzinaId: id } : { unitaId: id }) } });
    rev(tipo, id);
}

export async function aggiornaStima(sid, tipo, id, fd) {
    const d = leggiStima(fd);
    if (!d) return;
    await prisma.valoreImmobile.update({ where: { id: sid }, data: d });
    rev(tipo, id);
}

export async function eliminaStima(sid, tipo, id) {
    await prisma.valoreImmobile.delete({ where: { id: sid } });
    rev(tipo, id);
}