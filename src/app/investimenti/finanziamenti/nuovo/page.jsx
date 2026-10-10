import { prisma } from "@/lib/prisma";
import { FREQ } from "@/lib/ricorrenti";
import FormFinanziamento from "@/components/FormFinanziamento";

export const dynamic = "force-dynamic";

export default async function Nuovo({ searchParams }) {
  const sp = await searchParams;
  const palazzine = await prisma.palazzina.findMany({
    where: { dataVendita: null },
    orderBy: { nome: "asc" },
  });
  const unitaDb = await prisma.unita.findMany({
    where: { dataVendita: null },
    include: { palazzina: true },
    orderBy: { nome: "asc" },
  });
  const ric = await prisma.spesaRicorrente.findMany({
    where: { categoria: "MUTUO", finanziamento: { is: null } },
    orderBy: { descrizione: "asc" },
  });
  const ricorrenti = ric.map((r) => ({
    id: r.id,
    descrizione: r.descrizione,
    importo: r.importo,
    dal: r.dal.toISOString().slice(0, 10),
    al: r.al ? r.al.toISOString().slice(0, 10) : "",
    step: FREQ[r.frequenza][1],
  }));

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Nuovo finanziamento</h1>
      <FormFinanziamento
        palazzine={palazzine.map((p) => ({ id: p.id, nome: p.nome }))}
        unita={unitaDb.map((u) => ({
          id: u.id,
          nome: u.nome,
          palazzina: u.palazzina?.nome ?? null,
        }))}
        ricorrenti={ricorrenti}
        iniziale={{ dest: sp.dest, scopo: sp.scopo }}
      />
    </>
  );
}
