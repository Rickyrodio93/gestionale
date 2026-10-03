import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FormSpesa from "@/components/FormSpesa";

export const dynamic = "force-dynamic";

export default async function Modifica({ params }) {
  const { id } = await params;
  const spesa = await prisma.spesa.findUnique({ where: { id: Number(id) } });
  if (!spesa) notFound();
  const unita = await prisma.unita.findMany({
    where: { OR: [{ dataVendita: null }, { id: spesa.unitaId ?? -1 }] },
    include: { palazzina: true },
    orderBy: { nome: "asc" },
  });
  const palazzine = await prisma.palazzina.findMany({
    orderBy: { nome: "asc" },
  });
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Modifica spesa</h1>
      <FormSpesa unita={unita} palazzine={palazzine} spesa={spesa} />
    </>
  );
}
