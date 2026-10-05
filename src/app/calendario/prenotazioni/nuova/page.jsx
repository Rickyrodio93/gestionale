import Link from "next/link";
import { prisma } from "@/lib/prisma";
import FormPrenotazione from "@/components/FormPrenotazione";

export const dynamic = "force-dynamic";

export default async function Nuova() {
  const unita = await prisma.unita.findMany({
    where: { affittoBreve: true, dataVendita: null },
    orderBy: { nome: "asc" },
  });
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Nuova prenotazione</h1>
      {unita.length === 0 ? (
        <p className="text-sm text-gray-600">
          Nessuna unità è segnata come affitto breve: apri{" "}
          <Link
            href="/appartamenti"
            className="text-indigo-600 hover:underline"
          >
            Appartamenti
          </Link>{" "}
          → Modifica e spunta «Destinata ad affitto breve».
        </p>
      ) : (
        <FormPrenotazione unita={unita} />
      )}
    </>
  );
}
