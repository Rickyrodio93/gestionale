import FormVendita from "@/components/FormVendita";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Nuova({ searchParams }) {
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
  const unita = unitaDb.map((u) => ({
    id: u.id,
    nome: u.nome,
    palazzina: u.palazzina?.nome ?? null,
  }));

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Nuova vendita rateale</h1>
      <FormVendita
        palazzine={palazzine.map((p) => ({ id: p.id, nome: p.nome }))}
        unita={unita}
        dest={sp.dest}
      />
    </>
  );
}
