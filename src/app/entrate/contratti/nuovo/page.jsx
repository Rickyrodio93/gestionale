import FormContratto from "./FormContratto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Nuovo({ searchParams }) {
  const sp = await searchParams;
  const modalita = sp.modalita === "TRANSITORIO" ? "TRANSITORIO" : undefined;
  const unita = await prisma.unita.findMany({
    where: { dataVendita: null },
    include: { palazzina: true, catasto: { select: { id: true } } },
    orderBy: { nome: "asc" },
  });
  const inquilini = await prisma.inquilino.findMany({
    orderBy: { nome: "asc" },
  });
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">
        {modalita
          ? "Nuovo contratto transitorio"
          : "Nuovo contratto di affitto lungo"}
      </h1>
      <FormContratto
        unita={unita}
        inquilini={inquilini}
        modalitaIniziale={modalita}
      />
    </>
  );
}
