import { prisma } from "@/lib/prisma";
import { caricaMovimenti } from "@/lib/dashboard";
import { impostaContratti, dilazioni } from "./cedolare";
import { situazioneVendita, flussiResidui } from "./venditaRateale";

const r2 = (n) => Math.round(n * 100) / 100;
const ANNO_MS = 365.25 * 86400000;

// tasso annuo che rende nullo il valore dei flussi di cassa (bisezione)
function xirr(flussi) {
    const t0 = Math.min(...flussi.map((x) => x.data.getTime()));
    const f = (r) => flussi.reduce((s, x) => s + x.importo / Math.pow(1 + r, (x.data.getTime() - t0) / ANNO_MS), 0);
    let lo = -0.95, hi = 5;
    let flo = f(lo);
    const fhi = f(hi);
    if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return null;
    for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        const fm = f(mid);
        if (flo * fm <= 0) hi = mid;
        else { lo = mid; flo = fm; }
    }
    return (lo + hi) / 2;
}

// un immobile è misurabile se ha un prezzo di acquisto oppure una base di partenza
const haBase = (x) => x.prezzoAcquisto != null || x.valoreIniziale != null;

// data da cui si misura e capitale di partenza (la base di partenza ha la precedenza sull'acquisto)
const base = (x) => {
    const conBase = x.inizioMisura != null && x.valoreIniziale != null;
    return {
        inizioMisura: conBase ? x.inizioMisura : null,
        inizio: conBase ? x.inizioMisura : x.dataAcquisto,
        capitale0: conBase ? x.valoreIniziale : (x.prezzoAcquisto ?? 0) + (x.costiAcquisto ?? 0),
    };
};

export async function calcolaInvestimenti() {
    const oggi = new Date();
    const { movs } = await caricaMovimenti();

    const stime = await prisma.valoreImmobile.findMany({
        where: { tipo: { in: ["MERCATO", "PERIZIA", "OMI"] } },
        orderBy: { data: "desc" },
    });
    const ultimo = {};
    for (const v of stime) {
        const k = v.unitaId ? `u${v.unitaId}` : `p${v.palazzinaId}`;
        if (!(k in ultimo)) ultimo[k] = v;
    }

    const finanziamenti = await prisma.spesaRicorrente.findMany({
        where: { categoria: "MUTUO", capitaleLavori: { gt: 0 }, dataErogazione: { not: null } },
        include: { unita: { select: { palazzinaId: true } } },
    });

    const dil = await dilazioni();

    const vendite = await prisma.venditaRateale.findMany({ include: { rate: true, incassi: true } })

    const palazzine = await prisma.palazzina.findMany({ include: { unita: true }, orderBy: { nome: "asc" } });
    const autonome = await prisma.unita.findMany({ where: { palazzinaId: null }, orderBy: { nome: "asc" } });

    const lista = [];
    const mancanti = [];

    const daUnita = (u, nome) => ({
        tipo: "unita", id: u.id, nome: nome ?? u.nome,
        ...base(u),
        acq: u.dataAcquisto, prezzo: u.prezzoAcquisto, costi: u.costiAcquisto ?? 0,
        vend: u.dataVendita, prezzoV: u.prezzoVendita, costiV: u.costiVendita ?? 0,
        coperte: [u], esclusi: new Set(),
    });

    for (const p of palazzine) {
        const proprie = p.unita.filter(haBase);
        if (haBase(p)) {
            lista.push({
                tipo: "palazzina", id: p.id, nome: p.nome,
                ...base(p),
                acq: p.dataAcquisto, prezzo: p.prezzoAcquisto, costi: p.costiAcquisto ?? 0,
                vend: p.dataVendita, prezzoV: p.prezzoVendita, costiV: p.costiVendita ?? 0,
                coperte: p.unita.filter((u) => !haBase(u)),
                esclusi: new Set(proprie.map((u) => u.id)),
            });
        } else if (proprie.length === 0) {
            mancanti.push({ tipo: "palazzina", id: p.id, nome: p.nome });
        } else {
            p.unita
                .filter((u) => !haBase(u))
                .forEach((u) => mancanti.push({ tipo: "unita", id: u.id, nome: `${p.nome} — ${u.nome}` }));
        }
        proprie.forEach((u) => lista.push(daUnita(u, `${p.nome} — ${u.nome}`)));
    }
    for (const u of autonome) {
        if (haBase(u)) lista.push(daUnita(u));
        else mancanti.push({ tipo: "unita", id: u.id, nome: u.nome });
    }

    const risultati = await Promise.all(lista.map(async (inv) => {
        if (!inv.inizio) return { ...inv, errore: "Manca la data di acquisto o di partenza" };
        if (!(inv.capitale0 > 0)) return { ...inv, errore: "Manca il capitale di partenza" };

        const fineP = inv.vend ?? oggi;
        const inScope = (m) =>
            inv.tipo === "palazzina"
                ? m.palazzinaId === inv.id && !(m.unitaId && inv.esclusi.has(m.unitaId))
                : m.unitaId === inv.id;

        const flussi = [{ data: inv.inizio, importo: -inv.capitale0 }];
        let operativo = 0;
        let ristr = 0; // lavori registrati dopo la data di partenza: contano come capitale
        let rate = 0;  // rate del finanziamento: solo informative, escluse dal rendimento
        for (const m of movs) {
            if (!inScope(m) || m.data > fineP) continue;
            if (inv.inizioMisura && m.data < inv.inizioMisura) continue;
            if (m.cat === "CEDOLARE") continue;
            if (m.cat === "MUTUO") { rate += m.importo; continue; }
            const v = m.tipo === "entrata" ? m.importo : -m.importo;
            operativo += v;
            flussi.push({ data: m.data, importo: v });
            if (inv.inizioMisura && m.tipo === "uscita" && m.cat === "STRAORDINARIA") ristr += m.importo;
        }

        // parte di prestito spesa in lavori e non registrata come spesa
        let finanziato = 0;
        for (const f of finanziamenti) {
            const palId = f.palazzinaId ?? f.unita?.palazzinaId;
            const dentro =
                inv.tipo === "palazzina"
                    ? palId === inv.id && !(f.unitaId && inv.esclusi.has(f.unitaId))
                    : f.unitaId === inv.id;
            if (!dentro || f.dataErogazione > fineP) continue;
            if (inv.inizioMisura && f.dataErogazione < inv.inizioMisura) continue;
            finanziato += f.capitaleLavori;
            flussi.push({ data: f.dataErogazione, importo: -f.capitaleLavori });
        }

        // cedolare secca per competenza, attribuita ai contratti di questo immobile
        const mio = (x) =>
            inv.tipo === "palazzina" ? x.palazzinaId === inv.id && !inv.esclusi.has(x.unitaId) : x.unitaId === inv.id;
        const finoTs = Math.min(fineP.getTime(), oggi.getTime());
        let cedolare = 0;
        for (let y = inv.inizio.getUTCFullYear(); y <= new Date(finoTs).getUTCFullYear(); y++) {
            const imp = (await impostaContratti(y, { fino: finoTs, da: inv.inizio.getTime() }))
                .filter(mio).reduce((t, x) => t + x.imposta, 0);
            if (imp <= 0) continue;
            cedolare += imp;
            flussi.push({ data: new Date(Math.min(Date.UTC(y, 11, 31), finoTs)), importo: -imp });
        }

        // interessi e sanzioni delle dilazioni, in proporzione all'imposta di ogni anno
        let sanzioni = 0;
        for (const d of dil) {
            if (d.extra <= 0.005 || d.totale <= 0) continue;
            const tutte = await impostaContratti(d.anno);
            const tot = tutte.reduce((t, x) => t + x.imposta, 0);
            const mie = tutte.filter(mio).reduce((t, x) => t + x.imposta, 0);
            if (tot <= 0 || mie <= 0) continue;
            const quota = (d.extra / d.totale) * (mie / tot);
            for (const r of d.rate) {
                if (!r.pagataIl || r.pagataIl > fineP || r.pagataIl < inv.inizio) continue;
                sanzioni += r.importo * quota;
                flussi.push({ data: r.pagataIl, importo: -(r.importo * quota) });
            }
        }
        const imposte = cedolare + sanzioni;

        // vendite rateali (compromessi) di questo immobile
        const colleg = vendite.filter((v) => (inv.tipo === "palazzina" ? v.palazzinaId === inv.id : v.unitaId === inv.id));
        const attiva = colleg.find((v) => v.stato === "IN_CORSO");
        const conclusa = colleg.find((v) => v.stato === "CONCLUSA");
        let trattenuto = 0; // importi trattenuti da compromessi risolti
        for (const v of colleg) {
            if (v.stato !== "RISOLTA" || !(v.trattenuto > 0) || !v.dataChiusura) continue;
            if (v.dataChiusura > oggi || v.dataChiusura < inv.inizio) continue;
            trattenuto += v.trattenuto;
            flussi.push({ data: v.dataChiusura, importo: v.trattenuto });
        }

        // con la base di partenza i lavori sono capitale; senza, sono costi della gestione
        const capitale = inv.capitale0 + ristr + (inv.inizioMisura ? finanziato : 0);
        const opGest = operativo + ristr - imposte - (inv.inizioMisura ? 0 : finanziato) + trattenuto;

        let valore = 0, stimato = false, mancaValore = false, vendute = 0;
        let venditaInfo = null;
        if (attiva) {
            // vendita in corso: valore finale = prezzo concordato; flussi = incassi reali + rate ancora previste
            const s = situazioneVendita(attiva, oggi);
            valore = r2(attiva.prezzo - (attiva.costiVendita ?? 0));
            for (const i of attiva.incassi) if (i.data >= inv.inizio) flussi.push({ data: i.data, importo: i.importo });
            for (const f of flussiResidui(attiva, oggi)) flussi.push(f);
            if (attiva.costiVendita) flussi.push({ data: attiva.dataRogito ?? s.fineAttesa ?? oggi, importo: -attiva.costiVendita });
            venditaInfo = {
                id: attiva.id, acquirente: attiva.acquirente, prezzo: attiva.prezzo,
                incassato: s.incassato, residuo: s.residuo, pct: s.pct, arretrato: s.arretrato,
                recuperoTot: (opGest + s.incassato) / capitale,
            };
        } else if (inv.vend) {
            valore = (inv.prezzoV ?? 0) - inv.costiV;
            if (conclusa && conclusa.incassi.length) {
                // venduto a rate: i flussi sono gli incassi reali, non un'unica cifra al rogito
                for (const i of conclusa.incassi) flussi.push({ data: i.data, importo: i.importo });
                if (inv.costiV) flussi.push({ data: inv.vend, importo: -inv.costiV });
            } else {
                flussi.push({ data: inv.vend, importo: valore });
            }
        } else {
            const sp = inv.tipo === "palazzina" ? ultimo[`p${inv.id}`] : null;
            const singole = inv.coperte.some((u) => u.dataVendita);
            let stima = 0;
            if (sp && !singole) {
                stima = sp.importo;
            } else {
                if (inv.coperte.length === 0) mancaValore = true;
                for (const u of inv.coperte) {
                    if (u.dataVendita) {
                        const r = (u.prezzoVendita ?? 0) - (u.costiVendita ?? 0);
                        valore += r;
                        vendute++;
                        flussi.push({ data: u.dataVendita, importo: r });
                    } else if (ultimo[`u${u.id}`]) stima += ultimo[`u${u.id}`].importo;
                    else mancaValore = true;
                }
            }
            if (stima > 0) {
                valore += stima;
                stimato = true;
                flussi.push({ data: oggi, importo: stima });
            }
        }

        const anni = (fineP - inv.inizio) / ANNO_MS;
        const guadagno = mancaValore ? null : r2(opGest + valore - capitale);
        const stato = attiva ? "in_vendita" : inv.vend || (vendute > 0 && vendute === inv.coperte.length) ? "venduto" : vendute ? "parziale" : "in_corso";

        return {
            ...inv, capitale: r2(capitale), ristr: r2(ristr), imposte: r2(imposte), cedolare: r2(cedolare), sanzioni: r2(sanzioni), finanziato: r2(finanziato), rate: r2(rate), operativo: r2(opGest), valore: r2(valore),
            stimato, vendita: venditaInfo, trattenuto: r2(trattenuto), mancaValore, stato, anni, guadagno,
            roi: guadagno != null ? guadagno / capitale : null,
            recupero: opGest / capitale,
            rendOp: anni >= 0.25 ? opGest / anni / capitale : null,
            irr: !mancaValore && anni >= 1 ? xirr(flussi) : null,
        };
    }));

    return { risultati, mancanti };
}