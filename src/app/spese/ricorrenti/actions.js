"use server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sincronizzaRicorrenti } from "@/lib/ricorrenti";

const str = (v) => v?.toString().trim() || null;
const num = (v) => (v == null || String(v).trim() === "" ? null : Number(String(v).replace(",", ".")));

function leggi(fd) {
    const [tipo, idStr] = String(fd.get("destinazione") || "").split(":");
    const id = Number(idStr);
    const importo = num(fd.get("importo"));
    const descrizione = str(fd.get("descrizione"));
    if (!descrizione || importo == null || !id || !["unita", "palazzina"].includes(tipo))
        return { error: "Compila descrizione, a cosa si riferisce e importo." };
    const al = fd.get("al") ? new Date(fd.get("al")) : null;
    const mutuo = fd.get("categoria") === "MUTUO";
    const capitaleLavori = mutuo ? num(fd.get("capitaleLavori")) : null;
    const dataErogazione = mutuo && fd.get("dataErogazione") ? new Date(fd.get("dataErogazione")) : null;
    if (capitaleLavori && !dataErogazione) return { error: "Indica la data di erogazione del prestito." };
    return {
        dati: {
            categoria: fd.get("categoria"),
            descrizione,
            importo,
            frequenza: fd.get("frequenza"),
            al,
            fornitore: str(fd.get("fornitore")),
            note: str(fd.get("note")),
            unitaId: tipo === "unita" ? id : null,
            palazzinaId: tipo === "palazzina" ? id : null,
            ...(fd.has("capitaleLavori") ? {capitaleLavori, dataErogazione} : {}),
        },
    };
}

const rev = () => {
    revalidatePath("/spese");
    revalidatePath("/spese/ricorrenti");
};

export async function creaRicorrente(_prev, fd) {
    const r = leggi(fd);
    if (r.error) return r;
    if (!fd.get("dal")) return { error: "Inserisci la data della prima spesa." };
    const dal = new Date(fd.get("dal"));
    if (r.dati.al && r.dati.al < dal) return { error: "La data di fine è precedente all'inizio." };
    await prisma.spesaRicorrente.create({ data: { ...r.dati, dal } });
    await sincronizzaRicorrenti(); // genera subito le spese già maturate
    rev();
    redirect("/spese/ricorrenti");
}

export async function aggiornaRicorrente(id, _prev, fd) {
    const r = leggi(fd);
    if (r.error) return r;
    const att = await prisma.spesaRicorrente.findUnique({ where: { id } });
    if (r.dati.al && r.dati.al < att.dal) return { error: "La data di fine è precedente all'inizio." };
    await prisma.spesaRicorrente.update({ where: { id }, data: r.dati });
    await sincronizzaRicorrenti();
    rev();
    redirect("/spese/ricorrenti");
}

export async function eliminaRicorrente(id) {
    await prisma.spesaRicorrente.delete({ where: { id } }); // le spese già generate restano
    rev();
}