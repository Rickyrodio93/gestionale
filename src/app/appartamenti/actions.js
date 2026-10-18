"use server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CONDIZIONI } from "@/lib/condizioni";
import { viaDi, aggiornaPosizione, assegnaZone } from "@/lib/omiZona";
import { sincronizzaStimeOmi } from "@/lib/valutazioneOmi";

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
    const scope = fd.get("scopeAcquisto") || "nessuno";
    const acq = {
        dataAcquisto: fd.get("dataAcquisto") ? new Date(fd.get("dataAcquisto")) : null,
        prezzoAcquisto: num(fd.get("prezzoAcquisto")),
        costiAcquisto: num(fd.get("costiAcquisto")),
    };
    if (scope !== "nessuno" && !acq.dataAcquisto) return { error: "Indica la data di acquisto." };
    const vuoto = { dataAcquisto: null, prezzoAcquisto: null, costiAcquisto: null };
    const completo = REQ.every((k) => cat[k] != null);
    const parziale = REQ.some((k) => cat[k] != null);
    const haLungo = id ? (await prisma.contratto.count({ where: { unitaId: id, tipo: "LUNGO" } })) > 0 : false;
    const lungo = fd.get("lungo") === "on" || haLungo;

    if (lungo && !completo) return { error: "Per l'affitto lungo servono tutti i dati catastali obbligatori." };
    if (parziale && !completo) return { error: "Dati catastali incompleti: compila tutti i campi obbligatori o lascia la sezione vuota." };

    // indirizzo: della palazzina, oppure dell'unità se è autonoma
    const ind = { indirizzo: str(fd.get("indirizzo")), civico: str(fd.get("civico")), comune: str(fd.get("comune")) };
    if (!ind.indirizzo || !ind.civico || !ind.comune) return { error: "Inserisci via, numero civico e comune." };

    let palazzinaId = null;
    let datiInd = { indirizzo: null, civico: null, comune: null }; // sull'unità solo se autonoma
    let pos; // immobile che porta la posizione: [tipo, id]
    let cambioVia = true;

    if (fd.get("collocazione") === "palazzina") {
        const scelta = fd.get("palazzinaId");
        if (scelta === "nuova") {
            const nomePal = str(fd.get("nuovaPalazzina"));
            if (!nomePal) return { error: "Inserisci il nome della nuova palazzina." };
            const p = await prisma.palazzina.create({ data: { nome: nomePal, ...ind } });
            palazzinaId = p.id;
        } else if (scelta) {
            palazzinaId = Number(scelta);
            const prima = await prisma.palazzina.findUnique({ where: { id: palazzinaId } });
            if (!prima) return { error: "Palazzina non trovata." };
            cambioVia = viaDi(prima) !== viaDi(ind) || (prima.comune ?? "") !== ind.comune;
            await prisma.palazzina.update({ where: { id: palazzinaId }, data: ind });
        } else {
            return { error: "Scegli una palazzina." };
        }
        pos = ["palazzina", palazzinaId];
    } else {
        datiInd = ind;
        if (id) {
            const prima = await prisma.unita.findUnique({ where: { id } });
            cambioVia = !prima || viaDi(prima) !== viaDi(ind) || (prima.comune ?? "") !== ind.comune;
        }
        pos = ["unita", id]; // in creazione l'id si conosce dopo
    }

    const condizioni = Object.keys(CONDIZIONI).includes(fd.get("condizioni")) ? fd.get("condizioni") : "NORMALE";
    const dati = {
        nome,
        piano: str(fd.get("piano")),
        interno: str(fd.get("interno")),
        tipo: fd.get("tipo"),
        palazzinaId,
        ...datiInd,
        condizioni,
        ...(scope === "unita" ? acq : vuoto),
        affittoBreve: fd.get("affittoBreve") === "on",
        gestore: str(fd.get("gestore")),
        icalUrl: str(fd.get("icalUrl")),
        cin: str(fd.get("cin")),
    };
    return { dati, cat, completo, acqPal: scope === "palazzina" ? acq : null, pos, cambioVia };
}

// posizione dall'indirizzo → zona OMI → stima. Un errore qui non deve mai impedire il salvataggio.
async function aggiornaOmi(fd, [tipo, id], ricalcola) {
    try {
        const p = await aggiornaPosizione(tipo, id, { coordinate: str(fd.get("coordinate")), ricalcola });
        if (p?.error) console.warn("Posizione non trovata:", p.error, p.dettaglio ?? "");
        await assegnaZone();
        await sincronizzaStimeOmi();
    } catch (e) {
        console.error("aggiornaOmi:", e);
    }
}

function rev() {
    ["/appartamenti", "/investimenti", "/"].forEach((p) => revalidatePath(p));
}

export async function creaUnita(_prev, fd) {
    const r = await prepara(fd, null);
    if (r.error) return r;
    const u = await prisma.unita.create({ data: { ...r.dati, ...(r.completo && { catasto: { create: r.cat } }) } });
    if (r.acqPal && u.palazzinaId) await prisma.palazzina.update({ where: { id: u.palazzinaId }, data: r.acqPal });
    await aggiornaOmi(fd, r.pos[0] === "unita" ? ["unita", u.id] : r.pos, r.cambioVia);
    rev();
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
    if (r.acqPal && r.dati.palazzinaId) await prisma.palazzina.update({ where: { id: r.dati.palazzinaId }, data: r.acqPal });
    await aggiornaOmi(fd, r.pos, r.cambioVia);
    rev();
    redirect("/appartamenti");
}