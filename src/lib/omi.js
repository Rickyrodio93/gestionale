export function decodifica(buf) {
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(buf);
    } catch {
        return new TextDecoder("windows-1252").decode(buf); // i file originali possono non essere in UTF-8
    }
}

export function num(v) {
    let t = String(v ?? "").trim();
    if (!t) return null;
    if (t.includes(",")) t = t.replace(/\./g, "").replace(",", "."); // virgola decimale all'italiana
    const x = Number(t);
    return Number.isFinite(x) ? x : null;
}

function celle(riga) {
    const out = [];
    let cur = "";
    let virgolette = false;
    for (const ch of riga) {
        if (ch === '"') virgolette = !virgolette;
        else if (ch === ";" && !virgolette) {
            out.push(cur);
            cur = "";
        } else cur += ch;
    }
    out.push(cur);
    return out.map((c) => c.trim());
}

// legge un CSV OMI (separatore ";"): salta le righe iniziali di descrizione e usa i nomi delle colonne
export function leggiTabella(testo) {
    const righe = testo.replace(/^\uFEFF/, "").split(/\r?\n/).filter((r) => r.trim());
    const i = righe.findIndex((r) => /comune_cat/i.test(r) && /zona/i.test(r));
    if (i < 0) throw new Error("Intestazione non riconosciuta: manca la colonna «Comune_cat». Controlla di aver scelto i file giusti.");
    const head = celle(righe[i]).map((h) => h.toLowerCase());
    return righe.slice(i + 1).map((r) => {
        const c = celle(r);
        const o = {};
        head.forEach((h, k) => (o[h] = c[k] ?? ""));
        return o;
    });
}

// ---- perimetri delle zone (KML) ----
const coord = (t) =>
    t
        .trim()
        .split(/\s+/)
        .map((s) => s.split(",").map(Number))
        .filter((c) => c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]))
        .map((c) => [c[0], c[1]]);

export function leggiKml(testo) {
    const zone = new Map();
    let campione = null;

    for (const pm of testo.match(/<Placemark[\s>][\s\S]*?<\/Placemark>/gi) ?? []) {
        const piano = pm
            .replace(/<coordinates[\s\S]*?<\/coordinates>/gi, " ")
            .replace(/<!\[CDATA\[|\]\]>/g, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        campione ??= piano.slice(0, 300);

        const link = /\b[A-Z]{2}\d{8}\b/.exec(piano)?.[0]; // LinkZona, es. RC00004174
        if (!link) continue;

        const poligoni = [...pm.matchAll(/<Polygon[\s\S]*?<\/Polygon>/gi)]
            .map((p) =>
                [...p[0].matchAll(/<coordinates[^>]*>([\s\S]*?)<\/coordinates>/gi)].map((c) => coord(c[1])).filter((r) => r.length >= 3)
            )
            .filter((anelli) => anelli.length > 0);
        if (!poligoni.length) continue;

        const z = zone.get(link) ?? { linkZona: link, poligoni: [] };
        z.poligoni.push(...poligoni);
        zone.set(link, z);
    }

    if (!zone.size)
        throw new Error(
            `Nel file KML non trovo il codice delle zone (tipo «RM00001234»). Contenuto del primo elemento: «${campione ?? "file vuoto"}». Mandamelo e adatto la lettura.`
        );

    return [...zone.values()].map((z) => {
        let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
        for (const anelli of z.poligoni)
            for (const [lon, lat] of anelli[0]) {
                if (lon < minLon) minLon = lon;
                if (lon > maxLon) maxLon = lon;
                if (lat < minLat) minLat = lat;
                if (lat > maxLat) maxLat = lat;
            }
        return { linkZona: z.linkZona, geom: JSON.stringify(z.poligoni), minLon, maxLon, minLat, maxLat };
    });
}

function dentroAnello(x, y, anello) {
    let dentro = false;
    for (let i = 0, j = anello.length - 1; i < anello.length; j = i++) {
        const [xi, yi] = anello[i];
        const [xj, yj] = anello[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
    }
    return dentro;
}

// poligoni = [[anelloEsterno, ...buchi], ...]
export function dentroPoligoni(lon, lat, poligoni) {
    return poligoni.some(([esterno, ...buchi]) => dentroAnello(lon, lat, esterno) && !buchi.some((b) => dentroAnello(lon, lat, b)));
}

// distanza approssimata, in metri, dal bordo più vicino
export function distanzaBordoM(lon, lat, poligoni) {
    const kx = 111320 * Math.cos((lat * Math.PI) / 180);
    const ky = 110540;
    let min = Infinity;
    for (const anelli of poligoni)
        for (const a of anelli)
            for (let i = 0; i < a.length - 1; i++) {
                const ax = (a[i][0] - lon) * kx, ay = (a[i][1] - lat) * ky;
                const bx = (a[i + 1][0] - lon) * kx, by = (a[i + 1][1] - lat) * ky;
                const dx = bx - ax, dy = by - ay;
                const l2 = dx * dx + dy * dy;
                const t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
                min = Math.min(min, Math.hypot(ax + t * dx, ay + t * dy));
            }
    return min;
}