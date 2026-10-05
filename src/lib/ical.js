const GIORNO = 86400000;

const unfold = (t) => t.replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");

const giorno = (v) => {
    const m = /(\d{4})(\d{2})(\d{2})/.exec(v ?? "");
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
};

const unesc = (s) => s.replace(/\\[nN]/g, "\n").replace(/\\([,;\\])/g, "$1");

export function leggiIcal(testo) {
    if (!/BEGIN:VCALENDAR/i.test(testo)) throw new Error("Il link non restituisce un calendario iCal valido.");
    const eventi = [];
    let ev = null;

    for (const riga of unfold(testo)) {
        const r = riga.trimEnd();
        if (/^BEGIN:VEVENT$/i.test(r)) { ev = {}; continue; }
        if (/^END:VEVENT$/i.test(r)) {
            if (ev?.uid && ev.inizio && ev.stato !== "CANCELLED") {
                const fine = ev.fine && ev.fine > ev.inizio ? ev.fine : new Date(ev.inizio.getTime() + GIORNO);
                eventi.push({ uid: ev.uid, inizio: ev.inizio, fine, titolo: ev.titolo ?? "", descrizione: ev.descrizione ?? "" });
            }
            ev = null;
            continue;
        }
        if (!ev) continue;

        const i = r.indexOf(":");
        if (i < 0) continue;
        const nome = r.slice(0, i).split(";")[0].toUpperCase();
        const val = r.slice(i + 1);
        if (nome === "UID") ev.uid = val.trim();
        else if (nome === "DTSTART") ev.inizio = giorno(val);
        else if (nome === "DTEND") ev.fine = giorno(val);
        else if (nome === "SUMMARY") ev.titolo = unesc(val);
        else if (nome === "DESCRIPTION") ev.descrizione = unesc(val);
        else if (nome === "STATUS") ev.stato = val.trim().toUpperCase();
    }
    return eventi;
}