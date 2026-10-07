"use server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const str = (v) => v?.toString().trim() || null;
const num = (v) => (v == null || String(v).trim() === "" ? null : Number(String(v).replace(",", ".")));

function leggiSpesa(fd) {
  const importo = num(fd.get("importo"));
  const data = fd.get("data");
  const [tipo, idStr] = String(fd.get("destinazione") || "").split(":");
  const id = Number(idStr);
  if (importo == null || !data || !id || !["unita", "palazzina"].includes(tipo))
    return { error: "Compila categoria, a cosa si riferisce, data e importo." };

  const d = new Date(data);
  return {
    dati: {
      categoria: fd.get("categoria"),
      descrizione: str(fd.get("descrizione")),
      importo,
      data: d,
      anno: num(fd.get("anno")) ?? d.getFullYear(),
      fornitore: str(fd.get("fornitore")),
      note: str(fd.get("note")),
      unitaId: tipo === "unita" ? id : null,
      palazzinaId: tipo === "palazzina" ? id : null,
    },
  };
}

export async function creaSpesa(_prev, fd) {
  const r = leggiSpesa(fd);
  if (r.error) return r;
  await prisma.spesa.create({ data: r.dati });
  revalidatePath("/spese");
  redirect(`/spese?anno=${r.dati.anno}`);
}

export async function aggiornaSpesa(id, _prev, fd) {
  const r = leggiSpesa(fd);
  if (r.error) return r;
  await prisma.spesa.update({ where: { id }, data: r.dati });
  revalidatePath("/spese");
  redirect(`/spese?anno=${r.dati.anno}`);
}

export async function eliminaSpesa(id) {
  const s = await prisma.spesa.findUnique({ where: { id }, select: { rataId: true } });
  if (!s || s.rataId) return; // le spese delle rate si gestiscono dalla dilazione
  await prisma.spesa.delete({ where: { id } });
  revalidatePath("/spese");
}