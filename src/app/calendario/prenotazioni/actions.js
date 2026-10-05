"use server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { dataIt } from "@/lib/format";

const str = (v) => v?.toString().trim() || null;

async function sovrapposta(unitaId, checkIn, checkOut, escludiId) {
    const x = await prisma.prenotazione.findFirst({
        where: {
            unitaId,
            stato: "CONFERMATA",
            checkIn: { lt: checkOut },
            checkOut: { gt: checkIn },
            ...(escludiId ? { id: { not: escludiId } } : {}),
        },
    });
    return x
        ? `Le date si sovrappongono a un'altra prenotazione (${dataIt(x.checkIn)} → ${dataIt(x.checkOut)}): se è già nel calendario, modifica quella.`
        : null;
}

export async function creaPrenotazione(_prev, fd) {
    const unitaId = Number(fd.get("unitaId"));
    if (!unitaId || !fd.get("checkIn") || !fd.get("checkOut")) return { error: "Compila unità, check-in e check-out." };
    const checkIn = new Date(fd.get("checkIn"));
    const checkOut = new Date(fd.get("checkOut"));
    if (checkOut <= checkIn) return { error: "Il check-out deve essere successivo al check-in." };
    const conflitto = await sovrapposta(unitaId, checkIn, checkOut, null);
    if (conflitto) return { error: conflitto };

    await prisma.prenotazione.create({
        data: { unitaId, canale: fd.get("canale"), ospite: str(fd.get("ospite")), checkIn, checkOut, note: str(fd.get("note")), origine: "manuale" },
    });
    revalidatePath("/calendario");
    redirect("/calendario");
}

export async function aggiornaPrenotazione(id, _prev, fd) {
    const p = await prisma.prenotazione.findUnique({ where: { id } });
    if (!p) return { error: "Prenotazione non trovata." };

    // quelle importate: date e canale li gestisce il calendario, qui solo ospite e note
    let dati = { ospite: str(fd.get("ospite")), note: str(fd.get("note")) };
    if (p.origine !== "ical") {
        if (!fd.get("checkIn") || !fd.get("checkOut")) return { error: "Compila check-in e check-out." };
        const checkIn = new Date(fd.get("checkIn"));
        const checkOut = new Date(fd.get("checkOut"));
        if (checkOut <= checkIn) return { error: "Il check-out deve essere successivo al check-in." };
        const conflitto = await sovrapposta(p.unitaId, checkIn, checkOut, id);
        if (conflitto) return { error: conflitto };
        dati = { ...dati, checkIn, checkOut, canale: fd.get("canale") };
    }
    await prisma.prenotazione.update({ where: { id }, data: dati });
    revalidatePath("/calendario");
    redirect("/calendario");
}

export async function eliminaPrenotazione(id) {
    const p = await prisma.prenotazione.findUnique({ where: { id } });
    // una prenotazione importata e ancora presente nel calendario tornerebbe alla sincronizzazione successiva
    if (!p || (p.origine === "ical" && p.stato === "CONFERMATA")) return;
    await prisma.prenotazione.delete({ where: { id } });
    revalidatePath("/calendario");
    redirect("/calendario");
}