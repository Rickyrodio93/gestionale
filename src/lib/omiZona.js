import { prisma } from "@/lib/prisma";
import { dentroPoligoni } from "@/lib/omi";

// via + numero civico, come si scrive sulla busta
export const viaDi = (e) => [e?.indirizzo, e?.civico].filter(Boolean).join(" ").trim();

const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

async function cerca(params) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    for (const [k, v] of Object.entries({ format: "jsonv2", limit: "1", countrycodes: "it", ...params })) url.searchParams.set(k, v);
    const res = await fetch(url, {
        headers: { "User-Agent": "gestionale-appartamenti/1.0 (uso personale)", "Accept-Language": "it" },
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`il servizio ha risposto ${res.status}`);
    const [r] = await res.json();
    return r ? { lat: Number(r.lat), lon: Number(r.lon), nome: r.display_name } : null;
}

// Prova in ordine: via con civico (ricerca strutturata), testo libero, via senza civico.
// Restituisce anche l'esito di ogni tentativo, così si capisce perché non trova.
async function geocodifica({ via, civico, comune }) {
    const prove = [
        civico && { et: `«${civico} ${via}», ${comune}`, params: { street: `${civico} ${via}`, city: comune, country: "Italia" }, preciso: true },
        civico && { et: `«${via} ${civico}, ${comune}»`, params: { q: `${via} ${civico}, ${comune}, Italia` }, preciso: true },
        { et: `«${via}, ${comune}» (senza civico)`, params: { q: `${via}, ${comune}, Italia` }, preciso: false },
    ].filter(Boolean);
    const esiti = [];
    for (const [i, t] of prove.entries()) {
        if (i > 0) await attesa(1100); // Nominatim: al massimo 1 richiesta al secondo
        try {
            const r = await cerca(t.params);
            if (r) return { ...r, preciso: t.preciso, dettaglio: esiti.join(" · ") };
            esiti.push(`${t.et}: nessun risultato`);
        } catch (e) {
            esiti.push(`${t.et}: ${e.message}${e.cause?.code ? ` (${e.cause.code})` : ""}`);
            return { error: "Non riesco a usare il servizio di ricerca indirizzi.", dettaglio: esiti.join(" · ") };
        }
    }
    return { error: "Indirizzo non trovato: controlla via, numero e comune, oppure inserisci le coordinate.", dettaglio: esiti.join(" · ") };
}

function leggiCoordinate(t) {
    const m = /(-?\d+\.\d+)\s*[,;\s]\s*(-?\d+\.\d+)/.exec(t ?? "");
    return m ? { lat: Number(m[1]), lon: Number(m[2]) } : null;
}

// Salva latitudine e longitudine di una palazzina o di un'unità autonoma.
// Cerca l'indirizzo solo se mancano le coordinate o se l'indirizzo è cambiato (ricalcola).
export async function aggiornaPosizione(tipo, id, { coordinate, ricalcola } = {}) {
    const e = tipo === "palazzina" ? await prisma.palazzina.findUnique({ where: { id } }) : await prisma.unita.findUnique({ where: { id } });
    if (!e) return { error: "Immobile non trovato." };
    const scrivi = (data) =>
        tipo === "palazzina" ? prisma.palazzina.update({ where: { id }, data }) : prisma.unita.update({ where: { id }, data });

    let pos = null;
    if (coordinate) {
        pos = leggiCoordinate(coordinate);
        if (!pos) return { error: "Coordinate non riconosciute: usa il formato 45.46427, 9.18951." };
    } else if (ricalcola || e.lat == null || e.lon == null) {
        if (!viaDi(e) || !e.comune) {
            if (ricalcola) await scrivi({ lat: null, lon: null });
            return { error: "Indirizzo incompleto." };
        }
        const g = await geocodifica({ via: e.indirizzo, civico: e.civico, comune: e.comune });
        if (g.error) {
            if (ricalcola) await scrivi({ lat: null, lon: null }); // meglio nessuna posizione che una vecchia e sbagliata
            return g;
        }
        pos = g;
    }
    if (!pos) return { ok: true };
    if (!(pos.lat > 35 && pos.lat < 48 && pos.lon > 6 && pos.lon < 19))
        return { error: "Le coordinate cadono fuori dall'Italia: forse latitudine e longitudine sono invertite." };
    await scrivi({ lat: pos.lat, lon: pos.lon });
    return { ok: true, avviso: pos.preciso === false ? "Trovata solo la via, senza il civico: la posizione può essere spostata di qualche decina di metri." : null };
}

// riprova gli immobili con indirizzo ma senza coordinate (Nominatim: al massimo 1 richiesta al secondo)
export async function completaPosizioni() {
    const pal = await prisma.palazzina.findMany({ where: { lat: null } });
    const aut = await prisma.unita.findMany({ where: { palazzinaId: null, lat: null } });
    for (const [tipo, lista] of [["palazzina", pal], ["unita", aut]])
        for (const e of lista) {
            if (!viaDi(e) || !e.comune) continue;
            await aggiornaPosizione(tipo, e.id);
            await attesa(1100);
        }
}

// Per ogni palazzina (le sue unità ereditano la posizione) e unità autonoma, trova la zona OMI che contiene il punto.
export async function assegnaZone() {
    const nZone = await prisma.zonaOmi.count();
    const palazzine = await prisma.palazzina.findMany({ include: { unita: { include: { catasto: true } } } });
    const autonome = await prisma.unita.findMany({ where: { palazzinaId: null }, include: { catasto: true } });
    const gruppi = [
        ...palazzine.map((p) => ({ pos: p, unita: p.unita })),
        ...autonome.map((u) => ({ pos: u, unita: [u] })),
    ];

    for (const g of gruppi) {
        const { lat, lon } = g.pos;
        let trovate = [];
        if (nZone && lat != null && lon != null) {
            const cand = await prisma.zonaOmi.findMany({
                where: { minLat: { lte: lat }, maxLat: { gte: lat }, minLon: { lte: lon }, maxLon: { gte: lon } },
            });
            trovate = cand
                .map((z) => ({ chiave: z.linkZona, poligoni: JSON.parse(z.geom) }))
                .filter((x) => dentroPoligoni(lon, lat, x.poligoni))
                // le zone rurali (R…) possono sovrapporsi a quelle urbane: si preferiscono le altre
                .sort((a, b) => Number(a.chiave.split(":")[1].startsWith("R")) - Number(b.chiave.split(":")[1].startsWith("R")));
        }
        for (const u of g.unita) {
            const cod = u.catasto?.codiceComune?.toUpperCase();
            const t = trovate.find((x) => !cod || x.chiave.startsWith(`${cod}:`));
            const zona = t ? t.chiave.split(":")[1] : null;
            if (zona !== (u.omiZona ?? null)) await prisma.unita.update({ where: { id: u.id }, data: { omiZona: zona } });
        }
    }
}