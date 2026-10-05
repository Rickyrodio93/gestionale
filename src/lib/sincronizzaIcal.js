import { prisma } from "@/lib/prisma";
import { leggiIcal } from "@/lib/ical";

const RE_BLOCCO = /not available|non disponibile|unavailable|blocked|bloccat|closed/i;

function canaleDa(url) {
    let h = "";
    try { h = new URL(url).hostname.toLowerCase(); } catch { }
    if (h.includes("airbnb")) return "AIRBNB";
    if (h.includes("booking")) return "BOOKING";
    return "ALTRO";
}

export async function sincronizzaUnita(u) {
    try {
        const url = u.icalUrl.trim().replace(/^webcal:/i, "https:");
        const res = await fetch(url, { signal: AbortSignal.timeout(15000), cache: "no-store" });
        if (!res.ok) throw new Error(`Il server del calendario ha risposto ${res.status}.`);
        const eventi = leggiIcal(await res.text());

        const canale = canaleDa(url);
        const oggi = new Date();
        oggi.setUTCHours(0, 0, 0, 0);

        const esistenti = await prisma.prenotazione.findMany({ where: { unitaId: u.id, origine: "ical" } });
        const perUid = new Map(esistenti.filter((e) => e.uidEsterno).map((e) => [e.uidEsterno, e]));
        const visti = new Set();
        const ops = [];

        for (const e of eventi) {
            if (visti.has(e.uid)) continue;
            visti.add(e.uid);
            const blocco = RE_BLOCCO.test(e.titolo);
            const e0 = perUid.get(e.uid);
            if (e0) {
                ops.push(prisma.prenotazione.update({
                    where: { id: e0.id },
                    data: { checkIn: e.inizio, checkOut: e.fine, stato: "CONFERMATA", blocco },
                }));
            } else {
                const link = !blocco ? /https?:\/\/\S+/.exec(e.descrizione)?.[0] ?? null : null;
                ops.push(prisma.prenotazione.create({
                    data: { unitaId: u.id, canale, uidEsterno: e.uid, checkIn: e.inizio, checkOut: e.fine, blocco, origine: "ical", note: link },
                }));
            }
        }

        // spariti dal calendario e ancora futuri: la prenotazione è stata cancellata
        for (const e0 of esistenti)
            if (!visti.has(e0.uidEsterno) && e0.stato === "CONFERMATA" && e0.checkOut >= oggi)
                ops.push(prisma.prenotazione.update({ where: { id: e0.id }, data: { stato: "ANNULLATA" } }));

        await prisma.$transaction(ops);
        await prisma.unita.update({ where: { id: u.id }, data: { icalSincronizzato: new Date(), icalErrore: null } });
        return { ok: true };
    } catch (err) {
        if (err?.code === "P2002") return { ok: true }; // sincronizzazione parallela: l'altra ha già scritto
        await prisma.unita.update({
            where: { id: u.id },
            data: { icalErrore: String(err?.message ?? err).slice(0, 200) },
        });
        return { ok: false };
    }
}

export async function sincronizzaTutte({ forza = false } = {}) {
    const unita = await prisma.unita.findMany({
        where: { affittoBreve: true, dataVendita: null, icalUrl: { not: null } },
    });
    const limite = Date.now() - 30 * 60 * 1000;
    for (const u of unita) {
        if (!u.icalUrl.trim()) continue;
        // in automatico: non più di una volta ogni 30 minuti e mai su link in errore (si riprova a mano)
        if (!forza && (u.icalErrore || (u.icalSincronizzato && u.icalSincronizzato.getTime() > limite))) continue;
        await sincronizzaUnita(u);
    }
}