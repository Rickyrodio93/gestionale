import { prisma } from "@/lib/prisma";
import FormIncasso from "./FormIncasso";

export const dynamic = "force-dynamic";

export default async function Nuovo() {
  const unita = await prisma.unita.findMany({
    where: { affittoBreve: true },
    orderBy: { nome: "asc" },
  });
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">
        Registra incasso affitto breve
      </h1>
      {unita.length === 0 ? (
        <p className="text-sm text-gray-600">
          Nessuna unità è segnata come affitto breve: apri l'appartamento da
          Appartamenti → Modifica e spunta "Destinata ad affitto breve".
        </p>
      ) : (
        <FormIncasso unita={unita} />
      )}
    </>
  );
}
