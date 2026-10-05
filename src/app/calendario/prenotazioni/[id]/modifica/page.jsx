import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FormPrenotazione from "@/components/FormPrenotazione";
import BottoneElimina from "@/components/BottoneElimina";
import { eliminaPrenotazione } from "../../actions";

export const dynamic = "force-dynamic";

export default async function Modifica({ params }) {
  const { id } = await params;
  if (!Number.isInteger(Number(id))) notFound();
  const p = await prisma.prenotazione.findUnique({
    where: { id: Number(id) },
    include: { unita: true },
  });
  if (!p) notFound();
  const eliminabile = p.origine !== "ical" || p.stato === "ANNULLATA";

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Modifica prenotazione</h1>
        {eliminabile && (
          <BottoneElimina
            action={eliminaPrenotazione.bind(null, p.id)}
            messaggio="Eliminare questa prenotazione?"
          />
        )}
      </div>
      <FormPrenotazione unita={[]} prenotazione={p} />
    </>
  );
}
