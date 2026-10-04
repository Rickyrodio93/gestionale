import { prisma } from "@/lib/prisma";
import FormRicorrente from "@/components/FormRicorrente";

export const dynamic = "force-dynamic";

export default async function Nuova() {
  const unita = await prisma.unita.findMany({
    where: { dataVendita: null },
    include: { palazzina: true },
    orderBy: { nome: "asc" },
  });
  const palazzine = await prisma.palazzina.findMany({
    orderBy: { nome: "asc" },
  });
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Nuova spesa ricorrente</h1>
      <FormRicorrente unita={unita} palazzine={palazzine} />
    </>
  );
}
