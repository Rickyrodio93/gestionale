export const TIPI = { ACQUA: "Acqua", LUCE: "Luce", GAS: "Gas", ALTRO: "Altro" };

export const METODI = {
    A_CARICO: "A mio carico (nessuna ripartizione)",
    PERSONE: "Ripartita per numero di persone",
    CONSUMO: "Ripartita per consumo (letture)",
    EQUO: "Ripartita in parti uguali",
};

export const STATI = {
    carico: ["A mio carico", "bg-gray-200 text-gray-700"],
    rimborsata: ["Rimborsata", "bg-green-100 text-green-800"],
    parziale: ["Parziale", "bg-yellow-100 text-yellow-800"],
    da_incassare: ["Da incassare", "bg-red-100 text-red-800"],
};

const r2 = (n) => Math.round(n * 100) / 100;
const somma = (a) => a.reduce((t, x) => t + x, 0);

// righe: [{ contrattoId, persone, consumo }]; restituisce le quote nello stesso ordine
export function ripartisci({ metodo, importo, righe, consumoGenerale }) {
    if (!righe.length) return { error: "Seleziona almeno un inquilino a cui ripartire la bolletta." };

    let pesi, denom;
    let pieno = true; // true = l'intero importo viene ripartito

    if (metodo === "PERSONE") {
        pesi = righe.map((r) => r.persone ?? 0);
        denom = somma(pesi);
        if (denom <= 0) return { error: "Indica il numero di persone." };
    } else if (metodo === "EQUO") {
        pesi = righe.map(() => 1);
        denom = righe.length;
    } else if (metodo === "CONSUMO") {
        if (righe.some((r) => r.consumo == null))
            return { error: "Inserisci lettura iniziale e finale per ogni inquilino selezionato." };
        if (righe.some((r) => r.consumo < 0)) return { error: "Una lettura finale è inferiore all'iniziale." };
        pesi = righe.map((r) => r.consumo);
        const tot = somma(pesi);
        if (consumoGenerale != null && consumoGenerale > 0) {
            if (tot > consumoGenerale + 0.0001)
                return { error: "La somma dei consumi supera il consumo del contatore generale." };
            denom = consumoGenerale;
            pieno = false; // la differenza resta a carico del proprietario
        } else {
            denom = tot;
        }
        if (denom <= 0) return { error: "I consumi sono tutti nulli." };
    } else {
        return { error: "Metodo di ripartizione non valido." };
    }

    const quote = righe.map((r, i) => ({
        contrattoId: r.contrattoId,
        percentuale: pesi[i] / denom,
        importo: r2((importo * pesi[i]) / denom),
    }));

    if (pieno) {
        // assorbe i centesimi di arrotondamento sulla quota maggiore
        const diff = r2(importo - somma(quote.map((q) => q.importo)));
        if (diff !== 0) {
            const i = quote.reduce((m, q, k) => (q.importo > quote[m].importo ? k : m), 0);
            quote[i].importo = r2(quote[i].importo + diff);
        }
    }
    return { quote };
}

export function totaliBolletta(b) {
    const ripartito = somma(b.quote.map((q) => q.importo));
    const rimborsato = somma(b.quote.flatMap((q) => q.pagamenti.map((p) => p.importo)));
    return {
        aCarico: r2(b.importo - ripartito), // costo definitivo per il proprietario
        ripartito: r2(ripartito),
        rimborsato: r2(rimborsato),
        daIncassare: r2(ripartito - rimborsato),
    };
}

export function statoBolletta(b, t) {
    if (b.metodo === "A_CARICO" || b.quote.length === 0) return "carico";
    if (t.daIncassare <= 0.005) return "rimborsata";
    if (t.rimborsato > 0) return "parziale";
    return "da_incassare";
}