"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { decodifica, leggiTabella, leggiKml, num, dentroPoligoni, distanzaBordoM } from "@/lib/omi";

const str = (v) => v?.toString().trim() || null;

function rev() {
    ["/investimenti/valutazione", "/investimenti", "/"].forEach((p) => revalidatePath(p));
}

export async function importaOmi(_prev, fd) {
    const semestre = String(fd.get("semestre") ?? "").trim();
    const files = fd.getAll("file").filter((f) => f && f.size > 0);
    if (!files.length) return { error: "Scegli almeno un file (i valori OMI in CSV e/o i perimetri in KML)." };

    const codici = new Set(
        (await prisma.datiCatastali.findMany({ select: { codiceComune: true } })).map((c) => c.codiceComune.toUpperCase())
    );
    if (!codici.size) return { error: "Inserisci prima il catasto delle unità: servono i codici dei comuni." };

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
                if ("compr_min" in righe[0]) valori.push(...righe);
                else if ("zona_descr" in righe[0]) zone.push(...righe);
            }
        }
    } catch (e) {
        return { error: e.message };
    }
    if (!valori.length && !zone.length && !perimetri.size) return { error: "Nei file non ho trovato né quotazioni né perimetri." };

    // il codice catastale del comune (come nei dati catastali) è nella colonna Comune_amm
    const pulisci = (s) => String(s ?? "").replace(/^'+|'+$/g, "").trim();
    const descr = new Map(zone.map((r) => [`${r.comune_amm?.toUpperCase()}|${r.zona}`, pulisci(r.zona_descr)]));

    let importate = 0;
    let comuni = [];
    if (valori.length) {
        if (!/^\d{4}-[12]$/.test(semestre)) return { error: "Per i valori indica il semestre nel formato 2025-2 (anno, trattino, 1 o 2)." };
        const dati = [];
        for (const r of valori) {
            const comuneCat = r.comune_amm?.toUpperCase();
            if (!codici.has(comuneCat)) continue;
            const min = num(r.compr_min);
            const max = num(r.compr_max);
            if (!(min > 0) || !(max >= min)) continue; // senza valori di compravendita la riga non serve
            dati.push({
                semestre,
                comuneCat,
                comune: r.comune_descrizione || null,
                fascia: r.fascia || null,
                zona: r.zona,
                zonaDescr: descr.get(`${comuneCat}|${r.zona}`) || null,
                linkZona: r.linkzona || null,
                tipologia: r.descr_tipologia,
                stato: r.stato,
                min,
                max,
                superficie: r.sup_nl_compr || null,
            });
        }
        if (!dati.length && !perimetri.size)
            return {
                error: `Nessuna quotazione per i comuni delle tue unità (codici: ${[...codici].join(", ")}). Controlla che il file sia quello della tua provincia e che i codici catastali nei dati delle unità siano giusti.`,
            };
        comuni = [...new Set(dati.map((d) => d.comuneCat))];
        const lotti = [];
        for (let i = 0; i < dati.length; i += 400) lotti.push(prisma.quotazioneOmi.createMany({ data: dati.slice(i, i + 400) }));
        await prisma.$transaction([prisma.quotazioneOmi.deleteMany({ where: { semestre, comuneCat: { in: comuni } } }), ...lotti]);
        importate = dati.length;
    }

    for (const z of perimetri.values())
        await prisma.zonaOmi.upsert({ where: { linkZona: z.linkZona }, create: z, update: z });

    rev();
    return { ok: true, importate, comuni, zone: perimetri.size };
}

// ---- indirizzo → coordinate → zona ----
async function geocodifica(q) {
    try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        for (const [k, v] of Object.entries({ q, format: "jsonv2", limit: "1", countrycodes: "it" })) url.searchParams.set(k, v);
        const res = await fetch(url, {
            headers: { "User-Agent": "gestionale-appartamenti/1.0 (uso personale)", "Accept-Language": "it" },
            signal: AbortSignal.timeout(15000),
            cache: "no-store",
        });
        if (!res.ok)
            return { error: `Il servizio di ricerca indirizzi ha risposto ${res.status}. Riprova tra poco, oppure inserisci le coordinate.` };
        const [r] = await res.json();
        if (!r) return { error: "Indirizzo non trovato: controlla via, numero e comune, oppure inserisci le coordinate." };
        return { lat: Number(r.lat), lon: Number(r.lon), nome: r.display_name, preciso: Number(r.place_rank) >= 30 };
    } catch {
        return { error: "Non riesco a contattare il servizio di ricerca indirizzi: controlla la connessione o inserisci le coordinate." };
    }
}

function leggiCoordinate(t) {
    const m = /(-?\d+\.\d+)\s*[,;\s]\s*(-?\d+\.\d+)/.exec(t ?? "");
    return m ? { lat: Number(m[1]), lon: Number(m[2]) } : null;
}

export async function trovaZona(tipo, id, _prev, fd) {
    if (!["palazzina", "unita"].includes(tipo)) return { error: "Immobile non valido." };
    const indirizzo = str(fd.get("indirizzo"));
    const comune = str(fd.get("comune"));
    const avvisi = [];

    let pos;
    const manuale = str(fd.get("coordinate"));
    if (manuale) {
        pos = leggiCoordinate(manuale);
        if (!pos) return { error: "Coordinate non riconosciute: usa il formato 45.46427, 9.18951 (latitudine, longitudine)." };
        pos = { ...pos, nome: "coordinate inserite a mano", preciso: true };
    } else {
        if (!indirizzo || !comune) return { error: "Inserisci indirizzo e comune, oppure le coordinate." };
        pos = await geocodifica(`${indirizzo}, ${comune}`);
        if (pos.error) return pos;
    }
    if (!(pos.lat > 35 && pos.lat < 48 && pos.lon > 6 && pos.lon < 19))
        return { error: "Le coordinate cadono fuori dall'Italia: forse latitudine e longitudine sono invertite." };
    if (!pos.preciso)
        avvisi.push("L'indirizzo è stato trovato solo a livello di via, senza il numero civico: la posizione può essere spostata di qualche decina di metri.");

    // salvo posizione e indirizzo, così la ricerca non va ripetuta
    const datiPos = { lat: pos.lat, lon: pos.lon, ...(indirizzo ? { indirizzo } : {}), ...(comune ? { comune } : {}) };
    if (tipo === "palazzina") await prisma.palazzina.update({ where: { id }, data: datiPos });
    else await prisma.unita.update({ where: { id }, data: datiPos });

    const posizione = { lat: pos.lat, lon: pos.lon, nome: pos.nome };
    if ((await prisma.zonaOmi.count()) === 0) {
        rev();
        return { ok: true, posizione, zona: null, avvisi, messaggio: "Posizione salvata. Per trovare la zona importa prima i perimetri (file KML) del comune." };
    }

    const cand = await prisma.zonaOmi.findMany({
        where: { minLat: { lte: pos.lat }, maxLat: { gte: pos.lat }, minLon: { lte: pos.lon }, maxLon: { gte: pos.lon } },
    });
    let trovata = null;
    for (const z of cand) {
        const poligoni = JSON.parse(z.geom);
        if (dentroPoligoni(pos.lon, pos.lat, poligoni)) {
            trovata = { z, poligoni };
            break;
        }
    }
    if (!trovata) {
        rev();
        return { ok: true, posizione, zona: null, avvisi, messaggio: "Posizione salvata, ma non cade in nessuna zona importata: controlla che il KML sia del comune giusto e che l'indirizzo sia corretto." };
    }

    const dist = distanzaBordoM(pos.lon, pos.lat, trovata.poligoni);
    if (dist < 40)
        avvisi.push(`Il punto è a circa ${Math.round(dist)} m dal confine della zona: verifica sulla mappa dell'Agenzia, perché dall'altra parte potrebbe esserci un'altra zona.`);

    const q = await prisma.quotazioneOmi.findFirst({ where: { linkZona: trovata.z.linkZona }, orderBy: { semestre: "desc" } });
    if (!q) {
        rev();
        return {
            ok: true, posizione, zona: null, avvisi,
            messaggio: `Zona individuata (${trovata.z.linkZona}), ma mancano le quotazioni di questo comune: importa anche il file dei valori.`,
        };
    }

    if (tipo === "palazzina") await prisma.unita.updateMany({ where: { palazzinaId: id, dataVendita: null }, data: { omiZona: q.zona } });
    else await prisma.unita.update({ where: { id }, data: { omiZona: q.zona } });

    rev();
    return { ok: true, posizione, zona: q.zona, zonaDescr: q.zonaDescr, avvisi };
}

export async function salvaStimaOmi(unitaId, _prev, fd) {
    const u = await prisma.unita.findUnique({ where: { id: unitaId }, include: { catasto: true } });
    const sup = u?.catasto?.superficie;
    if (!(sup > 0)) return { error: "Manca la superficie catastale dell'unità." };

    const min = num(fd.get("min"));
    const max = num(fd.get("max"));
    if (!(min > 0) || !(max >= min)) return { error: "Indica minimo e massimo al m² (il massimo non può essere inferiore al minimo)." };

    const sem = str(fd.get("semestre")) ?? "manuale";
    const zona = str(fd.get("zona"));
    const tip = str(fd.get("tipologia"));
    const stato = str(fd.get("stato"));
    const importo = Math.round((sup * (min + max)) / 2);
    const fonte =
        `OMI ${sem}` +
        `${zona ? ` zona ${zona}` : ""}${tip ? `, ${tip}` : ""}${stato ? `, ${stato}` : ""}: ` +
        `${min}–${max} €/m² × ${sup} m² (Agenzia Entrate - OMI)`;

    await prisma.$transaction([
        // una sola stima per semestre: risalvando si sostituisce
        prisma.valoreImmobile.deleteMany({ where: { unitaId, tipo: "OMI", fonte: { startsWith: `OMI ${sem}` } } }),
        prisma.valoreImmobile.create({
            data: {
                unitaId, tipo: "OMI", data: new Date(), importo, fonte,
                note: `Intervallo ${Math.round(sup * min)}–${Math.round(sup * max)} €`,
            },
        }),
        prisma.unita.update({ where: { id: unitaId }, data: { omiZona: zona, omiTipologia: tip, omiStato: stato } }),
    ]);
    rev();
    return { ok: true, importo };
}