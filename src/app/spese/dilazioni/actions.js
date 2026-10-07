"use server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { addMonths } from "@/lib/scadenze";

const str = (v) => v?.toString().trim() || null;
const num = (v) => (v == null || String(v).trim() === "" ? null : Number(String(v).replace(",", ".")));
const r2 = (n) => Math.round(n * 100) / 100;

function rev(id) {
    ["/spese", "/spese/dilazioni", "/", "/calendario"].forEach((p) => revalidatePath(p));
    if (id) revalidatePath(`/spese/dilazioni/${id}`);
}

function leggiPiano(fd) {
    const descrizione = str(fd.get("descrizione"));
    const anno = num(fd.get("anno"));
    const impostaOriginaria = num(fd.get("impostaOriginaria"));
    if (!descrizione || !anno || impostaOriginaria == null || impostaOriginaria < 0)
        return { error: "Compila descrizione, anno d'imposta e imposta originaria." };
    return { dati: { descrizione, anno, impostaOriginaria, note: str(fd.get("note")) } };
}

export async function creaDilazione(_prev, fd) {
    const r = leggiPiano(fd);
    if (r.error) return r;
    const n = num(fd.get("numRate"));
    if (!n || n < 1 || n > 120 || !fd.get("prima")) return { error: "Indica il numero di rate (da 1 a 120) e la scadenza della prima." };

    const passo = num(fd.get("passo")) ?? 1;
    const prima = new Date(fd.get("prima"));
    const importo = num(fd.get("importoRata")) ?? r2(r.dati.impostaOriginaria / n); // provvisorio: si corregge sulla scheda

    const piano = await prisma.dilazioneImposta.create({
        data: {
            ...r.dati,
            rate: { create: Array.from({ length: n }, (_, k) => ({ numero: k + 1, scadenza: addMonths(prima, k * passo), importo })) },
        },
    });
    rev(piano.id);
    redirect(`/spese/dilazioni/${piano.id}`);
}

export async function aggiornaDilazione(id, _prev, fd) {
    const r = leggiPiano(fd);
    if (r.error) return r;
    await prisma.dilazioneImposta.update({ where: { id }, data: r.dati });
    await prisma.spesa.updateMany({ where: { rata: { dilazioneId: id } }, data: { anno: r.dati.anno } });
    rev(id);
    return { ok: true };
}

export async function eliminaDilazione(id) {
    await prisma.spesa.deleteMany({ where: { rata: { dilazioneId: id } } });
    await prisma.dilazioneImposta.delete({ where: { id } });
    rev(id);
    redirect("/spese/dilazioni");
}

export async function aggiungiRata(id, fd) {
    const importo = num(fd.get("importo"));
    if (!importo || !fd.get("scadenza")) return;
    const m = await prisma.rataDilazione.aggregate({ where: { dilazioneId: id }, _max: { numero: true } });
    await prisma.rataDilazione.create({
        data: { dilazioneId: id, numero: (m._max.numero ?? 0) + 1, scadenza: new Date(fd.get("scadenza")), importo },
    });
    rev(id);
}

export async function aggiornaRata(rataId, id, fd) {
    const importo = num(fd.get("importo"));
    if (!importo || !fd.get("scadenza")) return;
    await prisma.rataDilazione.update({ where: { id: rataId }, data: { importo, scadenza: new Date(fd.get("scadenza")) } });
    await prisma.spesa.updateMany({ where: { rataId }, data: { importo } }); // se la rata è già pagata, segue anche la spesa
    rev(id);
}

export async function segnaRataPagata(rataId, id, fd) {
    if (!fd.get("data")) return;
    const rata = await prisma.rataDilazione.findUnique({
        where: { id: rataId },
        include: { dilazione: { include: { rate: { select: { id: true } } } } },
    });
    if (!rata || rata.pagataIl) return;
    const data = new Date(fd.get("data"));
    await prisma.$transaction([
        prisma.spesa.create({
            data: {
                categoria: "CEDOLARE",
                descrizione: `Cedolare secca ${rata.dilazione.anno} — rata ${rata.numero}/${rata.dilazione.rate.length} (dilazione)`,
                importo: rata.importo,
                data,
                anno: rata.dilazione.anno,
                rataId,
            },
        }),
        prisma.rataDilazione.update({ where: { id: rataId }, data: { pagataIl: data } }),
    ]);
    rev(id);
}

export async function annullaPagamentoRata(rataId, id) {
    await prisma.$transaction([
        prisma.spesa.deleteMany({ where: { rataId } }),
        prisma.rataDilazione.update({ where: { id: rataId }, data: { pagataIl: null } }),
    ]);
    rev(id);
}

export async function eliminaRata(rataId, id) {
    await prisma.spesa.deleteMany({ where: { rataId } });
    await prisma.rataDilazione.delete({ where: { id: rataId } });
    rev(id);
}