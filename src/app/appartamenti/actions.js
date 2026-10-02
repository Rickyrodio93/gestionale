"use server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const str = (v) => v?.toString().trim() || null;
const num = (v) => (v == null || String(v).trim() === "" ? null : Number(String(v).replace(",", ".")));
const REQ = ["codiceComune", "foglio", "particella", "subalterno", "categoria", "classe", "consistenza", "rendita"];

async function prepara(fd, id) {
    const nome = str(fd.get("nome"));
    if (!nome) return { error: "Inserisci il nome dell'unità." };

    // catasto (validato prima di creare qualsiasi cosa)
    const cat = {
        codiceComune: str(fd.get("codiceComune")),
        sezione: str(fd.get("sezione")),
        foglio: str(fd.get("foglio")),
        particella: str(fd.get("particella")),
        subalterno: str(fd.get("subalterno")),
        zonaCensuaria: str(fd.get("zonaCensuaria")),
        categoria: str(fd.get("categoria")),
        classe: str(fd.get("classe")),
        consistenza: num(fd.get("consistenza")),
        superficie: num(fd.get("superficie")),
        rendita: num(fd.get("rendita")),
        quotaPossesso: num(fd.get("quotaPossesso")) ?? 100,
        aliquotaImu: num(fd.get("aliquotaImu")),
    };
    const completo = REQ.every((k) => cat[k] != null);
    const parziale = REQ.some((k) => cat[k] != null);
    const haLungo = id ? (await prisma.contratto.count({ where: { unitaId: id, tipo: "LUNGO" } })) > 0 : false;
    const lungo = fd.get("lungo") === "on" || haLungo;

    if (lungo && !completo) return { error: "Per l'affitto lungo servono tutti i dati catastali obbligatori." };
    if (parziale && !completo) return { error: "Dati catastali incompleti: compila tutti i campi obbligatori o lascia la sezione vuota." };

    // collocazione
    let palazzinaId = null;
    let indirizzo = null;
    const comune = str(fd.get("comune"));
    if (fd.get("collocazione") === "palazzina") {
        const scelta = fd.get("palazzinaId");
        if (scelta === "nuova") {
            const nomePal = str(fd.get("nuovaPalazzina"));
            if (!nomePal) return { error: "Inserisci il nome della nuova palazzina." };
            const p = await prisma.palazzina.create({ data: { nome: nomePal, indirizzo: str(fd.get("indirizzo")) } });
            palazzinaId = p.id;
        } else if (scelta) {
            palazzinaId = Number(scelta);
        } else {
            return { error: "Scegli una palazzina." };
        }
    } else {
        indirizzo = str(fd.get("indirizzo"));
        if (!indirizzo || !comune) return { error: "Per un'unità autonoma servono indirizzo e comune." };
    }

    const dati = {
        nome,
        piano: str(fd.get("piano")),
        interno: str(fd.get("interno")),
        tipo: fd.get("tipo"),
        palazzinaId,
        indirizzo,
        comune,
        dataAcquisto: fd.get("dataAcquisto") ? new Date(fd.get("dataAcquisto")) : null,
        prezzoAcquisto: num(fd.get("prezzoAcquisto")),
        affittoBreve: fd.get("affittoBreve") === "on",
        gestore: str(fd.get("gestore")),
        icalUrl: str(fd.get("icalUrl")),
        cin: str(fd.get("cin")),
    };
    return { dati, cat, completo };
}

export async function creaUnita(_prev, fd) {
    const r = await prepara(fd, null);
    if (r.error) return r;
    await prisma.unita.create({ data: { ...r.dati, ...(r.completo && { catasto: { create: r.cat } }) } });
    revalidatePath("/appartamenti");
    redirect("/appartamenti");
}

export async function aggiornaUnita(id, _prev, fd) {
    const r = await prepara(fd, id);
    if (r.error) return r;
    await prisma.unita.update({
        where: { id },
        data: { ...r.dati, ...(r.completo && { catasto: { upsert: { create: r.cat, update: r.cat } } }) },
    });
    if (!r.completo) await prisma.datiCatastali.deleteMany({ where: { unitaId: id } });
    revalidatePath("/appartamenti");
    redirect("/appartamenti");
}