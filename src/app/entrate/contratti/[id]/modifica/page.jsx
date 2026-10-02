import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FormContratto from "../../nuovo/FormContratto";

export const dynamic = "force-dynamic";

export default async function Modifica({ params }) {
  const { id } = await params;
  const contratto = await prisma.contratto.findUnique({
    where: { id: Number(id) },
    include: { unita: true },
  });
  if (!contratto) notFound();
  const inquilini = await prisma.inquilino.findMany({
    orderBy: { nome: "asc" },
  });
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Modifica contratto</h1>
      <FormContratto unita={[]} inquilini={inquilini} contratto={contratto} />
    </>
  );
}
