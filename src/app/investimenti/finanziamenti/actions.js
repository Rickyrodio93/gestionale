"use server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { addMonths } from "@/lib/scadenze";
import { FREQ, sincronizzaRicorrenti } from "@/lib/ricorrenti";
import { tassoPeriodale, rataDaTasso, FREQ_MESI } from "@/lib/finanziamento";

const str = (v) => v?.toString().trim() || null;
const num = (v) => (v == null || String(v).trim() === "" ? null : Number(String(v).replace(",", ".")));
const dt = (fd, k) => (fd.get(k) ? new Date(fd.get(k)) : null);
const mesiTra = (a, b) => (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());

function rev(id) {
    ["/investimenti", "/investimenti/finanziamenti", "/spese", "/spese/ricorrenti", "/calendario", "/"].forEach((p) => revalidatePath(p));
    if (id) revalidatePath(`/investimenti/finanziamenti/${id}`);
}

// fisso = { prima, step } in modifica: la prima rata e la frequenza non si cambiano dopo la creazione
async function leggi(fd, fisso) {
    const descrizione = str(fd.get("descrizione"));
    const [tipo, idStr] = String(fd.get("destinazione") || "").split(":");
    const dest = Number(idStr);
    const importo = num(fd.get("importo"));
    const erog = dt(fd, "dataErogazione");
    if (!descrizione || !["palazzina", "unita"].includes(tipo) || !dest || !importo || importo <= 0 || !erog)
        return { error: "Compila descrizione, immobile, importo e data di erogazione." };

    let prima = fisso?.prima ?? dt(fd, "primaRata");
    let step = fisso?.step ?? (Number(fd.get("frequenzaMesi")) || 1);
    let ricorrenteId = null;
    const scelta = fisso ? null : fd.get("ricorrente") || "nuova";
    if (scelta && !["nuova", "nessuna"].includes(scelta)) {
        const r = await prisma.spesaRicorrente.findFirst({
            where: { id: Number(scelta), categoria: "MUTUO", finanziamento: { is: null } },
        });
        if (!r) return { error: "La ricorrenza scelta non è disponibile." };
        prima = r.dal; // prima rata e frequenza sono quelle della ricorrenza esistente
        step = FREQ[r.frequenza][1];
        ricorrenteId = r.id;
    }
    if (!prima) return { error: "Indica la data della prima rata." };
    if (!FREQ_MESI[step]) return { error: "Frequenza non valida." };

    let n = num(fd.get("numeroRate"));
    const ultima = dt(fd, "ultimaRata");
    if (!n && ultima) {
        if (ultima < prima) return { error: "L'ultima rata è precedente alla prima." };
        n = Math.floor(mesiTra(prima, ultima) / step) + 1;
    }
    n = n ? Math.round(n) : null;
    if (!n || n < 1 || n > 600) return { error: "Indica il numero di rate (da 1 a 600) oppure la data dell'ultima rata." };

    let rata, tasso;
    if (fd.get("noto") === "tasso") {
        tasso = num(fd.get("tassoAnnuo"));
        if (tasso == null || tasso < 0) return { error: "Indica il tasso annuo." };
        rata = rataDaTasso(importo, tasso, n, step);
    } else {
        rata = num(fd.get("rata"));
        if (!rata || rata <= 0) return { error: "Indica l'importo della rata." };
        const i = tassoPeriodale(importo, rata, n);
        if (i == null) return { error: "Con questa rata e questo numero di rate il capitale non viene restituito: controlla i dati." };
        tasso = ((i * 12) / step) * 100;
    }

    return {
        ricorrenteId,
        ultimaData: addMonths(prima, (n - 1) * step),
        dati: {
            descrizione,
            scopo: fd.get("scopo") === "LAVORI" ? "LAVORI" : "ACQUISTO",
            palazzinaId: tipo === "palazzina" ? dest : null,
            unitaId: tipo === "unita" ? dest : null,
            importo,
            dataErogazione: erog,
            rata,
            frequenzaMesi: step,
            primaRata: prima,
            numeroRate: n,
            tassoAnnuo: tasso,
            speseIniziali: num(fd.get("speseIniziali")),
            note: str(fd.get("note")),
        },
    };
}

export async function creaFinanziamento(_prev, fd) {
    const r = await leggi(fd, null);
    if (r.error) return r;
    const d = r.dati;
    const scelta = fd.get("ricorrente") || "nuova";
    let ricorrenteId = r.ricorrenteId;

    if (scelta === "nuova") {
        const rc = await prisma.spesaRicorrente.create({
            data: {
                categoria: "MUTUO", descrizione: d.descrizione, importo: d.rata, frequenza: FREQ_MESI[d.frequenzaMesi],
                dal: d.primaRata, al: r.ultimaData, unitaId: d.unitaId, palazzinaId: d.palazzinaId,
            },
        });
        ricorrenteId = rc.id;
    } else if (ricorrenteId) {
        await prisma.spesaRicorrente.update({
            where: { id: ricorrenteId },
            data: { importo: d.rata, al: r.ultimaData, unitaId: d.unitaId, palazzinaId: d.palazzinaId },
        });
    }

    const f = await prisma.finanziamento.create({ data: { ...d, ricorrenteId } });
    if (ricorrenteId) await sincronizzaRicorrenti(); // registra come spese le rate già scadute
    rev(f.id);
    redirect(`/investimenti/finanziamenti/${f.id}`);
}

export async function aggiornaFinanziamento(id, _prev, fd) {
    const att = await prisma.finanziamento.findUnique({ where: { id } });
    if (!att) return { error: "Finanziamento non trovato." };
    const r = await leggi(fd, { prima: att.primaRata, step: att.frequenzaMesi });
    if (r.error) return r;
    await prisma.finanziamento.update({ where: { id }, data: r.dati });
    if (att.ricorrenteId) {
        await prisma.spesaRicorrente.update({
            where: { id: att.ricorrenteId },
            data: { descrizione: r.dati.descrizione, importo: r.dati.rata, al: r.ultimaData, unitaId: r.dati.unitaId, palazzinaId: r.dati.palazzinaId },
        });
        await sincronizzaRicorrenti();
    }
    rev(id);
    return { ok: true };
}

export async function eliminaFinanziamento(id) {
    await prisma.finanziamento.delete({ where: { id } }); // la ricorrenza delle rate e le spese già generate restano
    rev();
    redirect("/investimenti/finanziamenti");
}