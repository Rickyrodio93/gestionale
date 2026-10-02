import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FormUnita from "@/components/FormUnita";

export const dynamic = "force-dynamic";

export default async function Modifica({ params }) {
  const { id } = await params;
  const unita = await prisma.unita.findUnique({
    where: { id: Number(id) },
    include: {
      catasto: true,
      contratti: { where: { tipo: "LUNGO" }, select: { id: true } },
    },
  });
  if (!unita) notFound();
  const palazzine = await prisma.palazzina.findMany({
    orderBy: { nome: "asc" },
  });
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Modifica {unita.nome}</h1>
      <FormUnita palazzine={palazzine} unita={unita} />
    </>
  );
}
