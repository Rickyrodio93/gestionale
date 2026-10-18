"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { decodifica, leggiTabella, leggiKml, num, semestreDa } from "@/lib/omi";
import { completaPosizioni, assegnaZone } from "@/lib/omiZona";
import { sincronizzaStimeOmi } from "@/lib/valutazioneOmi";

function rev() {
    ["/investimenti", "/appartamenti", "/"].forEach((p) => revalidatePath(p));
}

// Carica i file OMI scaricati (VALORI e ZONE in CSV, perimetri in KML), poi trova da sé la zona di ogni immobile
// dal suo indirizzo e aggiorna le stime. Il semestre si legge dal file.
export async function importaOmi(_prev, fd) {
    const files = fd.getAll("file").filter((f) => f && f.size > 0);
    if (!files.length) return { error: "Scegli almeno un file (i valori OMI in CSV e/o i perimetri in KML)." };

    // si importano solo i comuni delle tue unità; se non c'è ancora nessun catasto, si importa tutto
    const codici = new Set(
        (await prisma.datiCatastali.findMany({ select: { codiceComune: true } })).map((c) => c.codiceComune.toUpperCase())
    );
    const filtra = codici.size > 0;

    const valori = [];
    const zone = [];
    const perimetri = new Map();
    try {
        for (const f of files) {
            const buf = await f.arrayBuffer();
            const b = new Uint8Array(buf);
            if (b[0] === 0x50 && b[1] === 0x4b)
                return { error: `«${f.name}» è un file compresso (KMZ o ZIP): estrailo e carica il file .kml o .csv che contiene.` };
            const testo = decodifica(buf);
            if (/\.kml$/i.test(f.name) || /<kml[\s>]/i.test(testo.slice(0, 3000))) {
                for (const z of leggiKml(testo)) perimetri.set(z.linkZona, z);
            } else {
                const righe = leggiTabella(testo);
                if (!righe.length) continue;
                if ("compr_min" in righe[0]) {
                    const sem = semestreDa(testo);
                    if (!sem) return { error: `Non trovo il semestre nella prima riga di «${f.name}»: il file è quello originale dell'Agenzia?` };
                    valori.push(...righe.map((r) => ({ ...r, _sem: sem })));
                } else if ("zona_descr" in righe[0]) zone.push(...righe);
            }
        }
    } catch (e) {
        return { error: e.message };
    }
    if (!valori.length && !zone.length && !perimetri.size) return { error: "Nei file non ho trovato né quotazioni né perimetri." };

    const pulisci = (s) => String(s ?? "").replace(/^'+|'+$/g, "").trim();
    const descr = new Map(zone.map((r) => [`${r.comune_amm?.toUpperCase()}|${r.zona}`, pulisci(r.zona_descr)]));

    let importate = 0;
    let comuni = [];
    let semestre = null;
    if (valori.length) {
        const dati = [];
        for (const r of valori) {
            const comuneCat = r.comune_amm?.toUpperCase();
            if (filtra && !codici.has(comuneCat)) continue;
            const min = num(r.compr_min);
            const max = num(r.compr_max);
            if (!(min > 0) || !(max >= min)) continue; // senza valori di compravendita la riga non serve
            dati.push({
                semestre: r._sem, comuneCat,
                comune: r.comune_descrizione || null,
                fascia: r.fascia || null,
                zona: r.zona,
                zonaDescr: descr.get(`${comuneCat}|${r.zona}`) || null,
                linkZona: r.linkzona || null,
                tipologia: r.descr_tipologia,
                stato: r.stato,
                min, max,
                superficie: r.sup_nl_compr || null,
            });
        }
        if (!dati.length && !perimetri.size)
            return {
                error: `Nessuna quotazione per i comuni delle tue unità (codici: ${[...codici].join(", ")}). Controlla che il file sia quello giusto e che i codici catastali nei dati delle unità siano corretti.`,
            };
        comuni = [...new Set(dati.map((d) => d.comuneCat))];
        semestre = dati[0]?.semestre ?? null;
        const coppie = [...new Set(dati.map((d) => `${d.semestre}|${d.comuneCat}`))].map((k) => k.split("|"));
        const lotti = [];
        for (let i = 0; i < dati.length; i += 400) lotti.push(prisma.quotazioneOmi.createMany({ data: dati.slice(i, i + 400) }));
        await prisma.$transaction([
            ...coppie.map(([s, c]) => prisma.quotazioneOmi.deleteMany({ where: { semestre: s, comuneCat: c } })),
            ...lotti,
        ]);
        importate = dati.length;
    }

    let nZone = 0;
    for (const z of perimetri.values()) {
        if (filtra && !codici.has(z.linkZona.split(":")[0])) continue;
        await prisma.zonaOmi.upsert({ where: { linkZona: z.linkZona }, create: z, update: z });
        nZone++;
    }

    // da qui in poi tutto automatico: coordinate mancanti → zona di ogni immobile → stime
    await completaPosizioni();
    await assegnaZone();
    await sincronizzaStimeOmi();

    rev();
    return { ok: true, importate, comuni, zone: nZone, semestre };
}