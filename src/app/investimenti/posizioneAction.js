"use server";
import { revalidatePath } from "next/cache";
import { aggiornaPosizione, assegnaZone } from "@/lib/omiZona";
import { sincronizzaStimeOmi } from "@/lib/valutazioneOmi";

// Rifà la ricerca dell'indirizzo (o salva le coordinate inserite a mano) e mostra l'errore vero se fallisce.
export async function cercaPosizione(tipo, id, _prev, fd) {
    if (!["palazzina", "unita"].includes(tipo)) return { error: "Immobile non valido." };
    const coordinate = fd.get("coordinate")?.toString().trim() || null;
    const r = await aggiornaPosizione(tipo, id, { coordinate, ricalcola: true });
    if (r.error) return r;
    await assegnaZone();
    await sincronizzaStimeOmi();
    ["/investimenti", "/appartamenti", "/"].forEach((p) => revalidatePath(p));
    return { ok: true, avviso: r.avviso };
}