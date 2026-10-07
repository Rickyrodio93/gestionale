import FormDilazione from "@/components/FormDilazione";

export const dynamic = "force-dynamic";

export default async function Nuova({ searchParams }) {
  const sp = await searchParams;
  const anno = sp.anno ? Number(sp.anno) : undefined;
  const iniziale = {
    anno,
    impostaOriginaria: sp.importo ? Number(sp.importo) : undefined,
    descrizione: anno ? `Cedolare secca ${anno} — rateizzazione` : undefined,
  };
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Nuova dilazione d'imposta</h1>
      <section className="max-w-3xl rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <FormDilazione iniziale={iniziale} />
      </section>
    </>
  );
}
