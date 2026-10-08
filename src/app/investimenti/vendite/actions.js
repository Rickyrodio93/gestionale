"use server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { addMonths } from "@/lib/scadenze";
import { situazioneVendita } from "@/lib/venditaRateale";

const str = (v) => v?.toString().trim() || null;
const num = (v) => (v == null || String(v).trim() === "" ? null : Number(String(v).replace(",", ".")));
const dt = (fd, k) => (fd.get(k) ? new Date(fd.get(k)) : null);
const r2 = (n) => Math.round(n * 100) / 100;

function rev(id) {
    ["/investimenti", "/investimenti/vendite", "/appartamenti", "/entrate", "/calendario", "/"].forEach((p) => revalidatePath(p));
    if (id) revalidatePath(`/investimenti/vendite/${id}`);
}

function generaPiano({ prezzo, anticipo, dataFirma, prima, passo, numRate, importoRata }) {
    const rate = [];
    if (anticipo > 0) rate.push({ tipo: "ANTICIPO", scadenza: dataFirma, importo: anticipo });
    const resto = r2(prezzo - anticipo);
    if (resto > 0.005) {
        const n = importoRata ? Math.ceil(resto / importoRata - 1e-9) : (numRate ?? 1);
        const imp = importoRata ?? r2(resto / n);
        let acc = 0;
        for (let k = 0; k < n; k++) {
            const ultima = k === n - 1;
            const importo = ultima ? r2(resto - acc) : imp;
            acc = r2(acc + importo);
            rate.push({ tipo: ultima ? "SALDO" : "RATA", scadenza: addMonths(prima, k * passo), importo });
        }
    }
    return rate;
}

export async function creaVendita(_prev, fd) {
    const [tipo, idStr] = String(fd.get("destinazione") || "").split(":");
    const id = Number(idStr);
    const acquirente = str(fd.get("acquirente"));
    const prezzo = num(fd.get("prezzo"));
    const dataFirma = dt(fd, "dataFirma");
    if (!["palazzina", "unita"].includes(tipo) || !id || !acquirente || !prezzo || prezzo <= 0 || !dataFirma)
        return { error: "Compila immobile, acquirente, data di firma e prezzo." };

    const anticipo = num(fd.get("anticipo")) ?? 0;
    if (anticipo < 0 || anticipo > prezzo) return { error: "L'anticipo non può essere negativo né superare il prezzo." };
    const prima = dt(fd, "prima");
    if (prezzo - anticipo > 0.005 && !prima) return { error: "Indica la scadenza della prima rata." };
    const numRate = num(fd.get("numRate"));
    const importoRata = num(fd.get("importoRata"));
    if ((numRate && numRate > 360) || (importoRata && (prezzo - anticipo) / importoRata > 360)) return { error: "Troppe rate (massimo 360)." };

    const dove = tipo === "palazzina" ? { palazzinaId: id } : { unitaId: id };
    if (await prisma.venditaRateale.count({ where: { stato: "IN_CORSO", ...dove } }))
        return { error: "Esiste già una vendita in corso per questo immobile." };

    const rate = generaPiano({ prezzo, anticipo, dataFirma, prima, passo: num(fd.get("passo")) ?? 1, numRate, importoRata });
    const v = await prisma.venditaRateale.create({
        data: {
            ...dove,
            acquirente, dataFirma, prezzo,
            costiVendita: num(fd.get("costiVendita")),
            dataRogito: dt(fd, "dataRogito"),
            note: str(fd.get("note")),
            rate: { create: rate },
            incassi: {
                create: anticipo > 0 && fd.get("anticipoIncassato") === "on"
                    ? [{ data: dataFirma, importo: anticipo, note: "Anticipo alla firma del compromesso" }]
                    : [],
            },
        },
    });
    rev(v.id);
    redirect(`/investimenti/vendite/${v.id}`);
}

export async function aggiornaVendita(id, fd) {
    const acquirente = str(fd.get("acquirente"));
    const prezzo = num(fd.get("prezzo"));
    const dataFirma = dt(fd, "dataFirma");
    if (!acquirente || !prezzo || prezzo <= 0 || !dataFirma) return;
    const v = await prisma.venditaRateale.findUnique({ where: { id }, select: { stato: true } });
    if (v?.stato !== "IN_CORSO") return;
    await prisma.venditaRateale.update({
        where: { id },
        data: { acquirente, prezzo, dataFirma, costiVendita: num(fd.get("costiVendita")), dataRogito: dt(fd, "dataRogito"), note: str(fd.get("note")) },
    });
    rev(id);
}

export async function eliminaVendita(id) {
    const v = await prisma.venditaRateale.findUnique({ where: { id }, select: { stato: true } });
    if (!v || v.stato === "CONCLUSA") return; // prima va annullata la conclusione
    await prisma.venditaRateale.delete({ where: { id } });
    rev();
    redirect("/investimenti/vendite");
}

// ---- piano e incassi ----
export async function aggiungiRataVendita(id, fd) {
    const importo = num(fd.get("importo"));
    const scadenza = dt(fd, "scadenza");
    if (!importo || !scadenza) return;
    await prisma.rataVendita.create({ data: { venditaId: id, scadenza, importo, tipo: "RATA" } });
    rev(id);
}
export async function aggiornaRataVendita(rataId, id, fd) {
    const importo = num(fd.get("importo"));
    const scadenza = dt(fd, "scadenza");
    if (!importo || !scadenza) return;
    await prisma.rataVendita.update({ where: { id: rataId }, data: { importo, scadenza } });
    rev(id);
}
export async function eliminaRataVendita(rataId, id) {
    await prisma.rataVendita.delete({ where: { id: rataId } });
    rev(id);
}

export async function registraIncassoVendita(id, fd) {
    const importo = num(fd.get("importo"));
    const data = dt(fd, "data");
    if (!importo || importo <= 0 || !data) return;
    await prisma.incassoVendita.create({ data: { venditaId: id, data, importo, note: str(fd.get("note")) } });
    rev(id);
}
export async function aggiornaIncassoVendita(incId, id, fd) {
    const importo = num(fd.get("importo"));
    const data = dt(fd, "data");
    if (!importo || importo <= 0 || !data) return;
    await prisma.incassoVendita.update({ where: { id: incId }, data: { importo, data, note: str(fd.get("note")) } });
    rev(id);
}
export async function eliminaIncassoVendita(incId, id) {
    await prisma.incassoVendita.delete({ where: { id: incId } });
    rev(id);
}

// ---- esito ----
export async function concludiVendita(id, fd) {
    const data = dt(fd, "data");
    if (!data) return;
    const v = await prisma.venditaRateale.findUnique({ where: { id }, include: { rate: true, incassi: true } });
    if (!v || v.stato !== "IN_CORSO" || situazioneVendita(v).residuo > 0.005) return; // serve il prezzo incassato per intero

    const dati = { dataVendita: data, prezzoVendita: v.prezzo, costiVendita: v.costiVendita };
    await prisma.$transaction([
        prisma.venditaRateale.update({ where: { id }, data: { stato: "CONCLUSA", dataChiusura: data, dataRogito: data } }),
        v.palazzinaId
            ? prisma.palazzina.update({ where: { id: v.palazzinaId }, data: dati })
            : prisma.unita.update({ where: { id: v.unitaId }, data: dati }),
        ...(v.palazzinaId
            ? [prisma.unita.updateMany({ where: { palazzinaId: v.palazzinaId, dataVendita: null }, data: { dataVendita: data } })]
            : []),
    ]);
    rev(id);
}

export async function annullaConclusione(id) {
    const v = await prisma.venditaRateale.findUnique({ where: { id } });
    if (!v || v.stato !== "CONCLUSA") return;
    const azzera = { dataVendita: null, prezzoVendita: null, costiVendita: null };
    await prisma.$transaction([
        prisma.venditaRateale.update({ where: { id }, data: { stato: "IN_CORSO", dataChiusura: null } }),
        v.palazzinaId
            ? prisma.palazzina.update({ where: { id: v.palazzinaId }, data: azzera })
            : prisma.unita.update({ where: { id: v.unitaId }, data: azzera }),
        ...(v.palazzinaId
            ? [prisma.unita.updateMany({ where: { palazzinaId: v.palazzinaId, dataVendita: v.dataChiusura }, data: { dataVendita: null } })]
            : []),
    ]);
    rev(id);
}

export async function risolviVendita(id, fd) {
    const data = dt(fd, "data");
    if (!data) return;
    const v = await prisma.venditaRateale.findUnique({ where: { id }, select: { stato: true } });
    if (v?.stato !== "IN_CORSO") return;
    await prisma.venditaRateale.update({
        where: { id },
        data: { stato: "RISOLTA", dataChiusura: data, trattenuto: num(fd.get("trattenuto")) ?? 0 },
    });
    rev(id);
}

export async function riapriVendita(id) {
    await prisma.venditaRateale.updateMany({ where: { id, stato: "RISOLTA" }, data: { stato: "IN_CORSO", dataChiusura: null, trattenuto: null } });
    rev(id);
}