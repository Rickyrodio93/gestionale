import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FormBolletta from "@/components/FormBolletta";
import { datiForm } from "@/lib/datiBolletta";

export const dynamic = "force-dynamic";

export default async function Modifica({ params }) {
  const { id } = await params;
  const bolletta = await prisma.bolletta.findUnique({
    where: { id: Number(id) },
    include: { quote: true },
  });
  if (!bolletta) notFound();
  const dati = await datiForm(bolletta.id);
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Modifica bolletta</h1>
      <FormBolletta {...dati} bolletta={bolletta} />
    </>
  );
}
