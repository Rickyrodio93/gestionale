import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FormIncasso from "../../nuovo/FormIncasso";

export const dynamic = "force-dynamic";

export default async function Modifica({ params }) {
  const { id } = await params;
  const incasso = await prisma.incasso.findUnique({
    where: { id: Number(id) },
  });
  if (!incasso) notFound();
  const unita = await prisma.unita.findMany({
    where: { OR: [{ affittoBreve: true }, { id: incasso.unitaId }] },
    orderBy: { nome: "asc" },
  });
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Modifica incasso</h1>
      <FormIncasso unita={unita} incasso={incasso} />
    </>
  );
}
