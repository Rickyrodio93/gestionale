import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FormRicorrente from "@/components/FormRicorrente";

export const dynamic = "force-dynamic";

export default async function Modifica({ params }) {
  const { id } = await params;
  if (!Number.isInteger(Number(id))) notFound();
  const ricorrente = await prisma.spesaRicorrente.findUnique({
    where: { id: Number(id) },
  });
  if (!ricorrente) notFound();
  const unita = await prisma.unita.findMany({
    where: { OR: [{ dataVendita: null }, { id: ricorrente.unitaId ?? -1 }] },
    include: { palazzina: true },
    orderBy: { nome: "asc" },
  });
  const palazzine = await prisma.palazzina.findMany({
    orderBy: { nome: "asc" },
  });
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Modifica spesa ricorrente</h1>
      <FormRicorrente
        unita={unita}
        palazzine={palazzine}
        ricorrente={ricorrente}
      />
    </>
  );
}
