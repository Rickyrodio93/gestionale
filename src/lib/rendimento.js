import { prisma } from "@/lib/prisma";
import { caricaMovimenti } from "@/lib/dashboard";

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

    const palazzine = await prisma.palazzina.findMany({ include: { unita: true }, orderBy: { nome: "asc" } });
    const autonome = await prisma.unita.findMany({ where: { palazzinaId: null }, orderBy: { nome: "asc" } });

    const lista = [];
    const mancanti = [];

    const daUnita = (u, nome) => ({
        tipo: "unita", id: u.id, nome: nome ?? u.nome,
        acq: u.dataAcquisto, prezzo: u.prezzoAcquisto, costi: u.costiAcquisto ?? 0,
        vend: u.dataVendita, prezzoV: u.prezzoVendita, costiV: u.costiVendita ?? 0,
        coperte: [u], esclusi: new Set(),
    });

    for (const p of palazzine) {
        const proprie = p.unita.filter((u) => u.prezzoAcquisto != null);
        if (p.prezzoAcquisto != null) {
            lista.push({
                tipo: "palazzina", id: p.id, nome: p.nome,
                acq: p.dataAcquisto, prezzo: p.prezzoAcquisto, costi: p.costiAcquisto ?? 0,
                vend: p.dataVendita, prezzoV: p.prezzoVendita, costiV: p.costiVendita ?? 0,
                coperte: p.unita.filter((u) => u.prezzoAcquisto == null),
                esclusi: new Set(proprie.map((u) => u.id)),
            });
        } else if (proprie.length === 0) {
            mancanti.push({ tipo: "palazzina", id: p.id, nome: p.nome });
        } else {
            p.unita
                .filter((u) => u.prezzoAcquisto == null)
                .forEach((u) => mancanti.push({ tipo: "unita", id: u.id, nome: `${p.nome} — ${u.nome}` }));
        }
        proprie.forEach((u) => lista.push(daUnita(u, `${p.nome} — ${u.nome}`)));
    }
    for (const u of autonome) {
        if (u.prezzoAcquisto != null) lista.push(daUnita(u));
        else mancanti.push({ tipo: "unita", id: u.id, nome: u.nome });
    }

    const risultati = lista.map((inv) => {
        if (!inv.acq) return { ...inv, errore: "Manca la data di acquisto" };

        const fineP = inv.vend ?? oggi;
        const capitale = inv.prezzo + inv.costi;
        const inScope = (m) =>
            inv.tipo === "palazzina"
                ? m.palazzinaId === inv.id && !(m.unitaId && inv.esclusi.has(m.unitaId))
                : m.unitaId === inv.id;

        const flussi = [{ data: inv.acq, importo: -capitale }];
        let operativo = 0;
        for (const m of movs) {
                  if (m.cat === "MUTUO" || !inScope(m) || m.data > fineP) continue;
            const v = m.tipo === "entrata" ? m.importo : -m.importo;
            operativo += v;
            flussi.push({ data: m.data, importo: v });
        }

        let valore = 0, stimato = false, mancaValore = false, vendute = 0;
        if (inv.vend) {
            valore = (inv.prezzoV ?? 0) - inv.costiV;
            flussi.push({ data: inv.vend, importo: valore });
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

        const anni = (fineP - inv.acq) / ANNO_MS;
        const guadagno = mancaValore ? null : r2(operativo + valore - capitale);
        const stato = inv.vend || (vendute > 0 && vendute === inv.coperte.length) ? "venduto" : vendute ? "parziale" : "in_corso";

        return {
            ...inv, capitale: r2(capitale), operativo: r2(operativo), valore: r2(valore), stimato, mancaValore, stato, anni,
            guadagno,
            roi: guadagno != null ? guadagno / capitale : null,
            recupero: operativo / capitale,
            rendOp: anni >= 0.25 ? operativo / anni / capitale : null,
            irr: !mancaValore && anni >= 1 ? xirr(flussi) : null,
        };
    });

    return { risultati, mancanti };
}