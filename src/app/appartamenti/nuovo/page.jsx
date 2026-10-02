import { prisma } from "@/lib/prisma";
import FormUnita from "@/components/FormUnita";

export const dynamic = "force-dynamic";

export default async function Nuovo() {
  const palazzine = await prisma.palazzina.findMany({
    orderBy: { nome: "asc" },
  });
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Nuovo appartamento</h1>
      <FormUnita palazzine={palazzine} />
    </>
  );
}
