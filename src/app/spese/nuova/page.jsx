import FormSpesa from "@/components/FormSpesa";
import { prisma } from "@/lib/prisma";



export default async function Nuova() {
    const unita = await prisma.unita.findMany({where: {dataVendita: null}, include: {palazzina: true}, orderBy: {nome: "asc"}});
    const palazzine = await prisma.palazzina.findMany({orderBy: {nome: "asc"}});
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Nuova spesa</h1>
      <FormSpesa unita={unita} palazzine={palazzine} />
    </>
  );
}
