import { prisma } from "@/lib/prisma";
import { addMonths } from "@/lib/scadenze";

export const FREQ = {
    MENSILE: ["Mensile", 1],
    BIMESTRALE: ["Bimestrale", 2],
    TRIMESTRALE: ["Trimestrale", 3],
    SEMESTRALE: ["Semestrale", 6],
    ANNUALE: ["Annuale", 12],
};

function occorrenze(r, fino) {
    const step = FREQ[r.frequenza][1];
    const limite = r.al && r.al < fino ? r.al : fino;
    const out = [];
    for (let k = 0; k < 600; k++) {
        const d = addMonths(r.dal, k * step); // parte sempre dalla data iniziale: nessuna deriva sui giorni 29-31
        if (d > limite) break;
        out.push(d);
    }
    return out;
}

export function prossima(r, da = new Date()) {
    const step = FREQ[r.frequenza][1];
    for (let k = 0; k < 600; k++) {
        const d = addMonths(r.dal, k * step);
        if (r.al && d > r.al) return null;
        if (d > da) return d;
    }
    return null;
}

// crea le spese reali mancanti fino a oggi; sicura da chiamare più volte
export async function sincronizzaRicorrenti() {
    try {
        const oggi = new Date();
        const ricorrenti = await prisma.spesaRicorrente.findMany();
        for (const r of ricorrenti) {
            const nuove = occorrenze(r, oggi).filter((d) => !r.ultimaGenerazione || d > r.ultimaGenerazione);
            if (!nuove.length) continue;
            await prisma.$transaction([
                prisma.spesa.createMany({
                    data: nuove.map((d) => ({
                        categoria: r.categoria,
                        descrizione: r.descrizione,
                        importo: r.importo,
                        data: d,
                        anno: d.getUTCFullYear(),
                        fornitore: r.fornitore,
                        note: r.note,
                        unitaId: r.unitaId,
                        palazzinaId: r.palazzinaId,
                        ricorrenteId: r.id,
                        periodo: d.toISOString().slice(0, 10),
                    })),
                }),
                prisma.spesaRicorrente.update({
                    where: { id: r.id },
                    data: { ultimaGenerazione: nuove[nuove.length - 1] },
                }),
            ]);
        }
    } catch (e) {
        console.error("sincronizzaRicorrenti:", e);
    }
}