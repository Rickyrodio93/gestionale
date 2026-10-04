import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { eur, dataIt } from "@/lib/format";
import { CATEGORIE } from "@/lib/spese";
import { FREQ, prossima, sincronizzaRicorrenti } from "@/lib/ricorrenti";
import BottoneElimina from "@/components/BottoneElimina";
import { eliminaRicorrente } from "./actions";

export const dynamic = "force-dynamic";

export default async function Ricorrenti() {
  await sincronizzaRicorrenti();
  const lista = await prisma.spesaRicorrente.findMany({
    include: {
      unita: { include: { palazzina: true } },
      palazzina: true,
      _count: { select: { spese: true } },
    },
    orderBy: { descrizione: "asc" },
  });
  const oggi = new Date();
  const attive = lista.filter((r) => !r.al || r.al >= oggi);
  const annuo = (r) => r.importo * (12 / FREQ[r.frequenza][1]);
  const costoAnnuo = attive.reduce((t, r) => t + annuo(r), 0);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/spese" className="text-xs text-gray-500 hover:underline">
            ← Spese
          </Link>
          <h1 className="text-2xl font-bold">Spese ricorrenti</h1>
        </div>
        <Link
          href="/spese/ricorrenti/nuova"
          className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} /> Nuova ricorrente
        </Link>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs text-gray-500">
          {attive.length} attive · costo annuo stimato{" "}
          <b className="text-gray-800">{eur(costoAnnuo)}</b>. Le spese vengono
          create automaticamente alla scadenza di ogni periodo e compaiono in
          Spese con il simbolo ↻.
        </p>
        {lista.length === 0 ? (
          <p className="text-sm text-gray-500">Nessuna spesa ricorrente.</p>
        ) : (
          <table className="w-full">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="pb-2">Descrizione</th>
                <th>Riferimento</th>
                <th>Frequenza</th>
                <th className="text-right">Importo</th>
                <th className="text-right">Annuo</th>
                <th className="pl-4">Periodo</th>
                <th>Prossima</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => {
                const p = prossima(r);
                return (
                  <tr key={r.id} className="border-t border-gray-100 text-sm">
                    <td className="py-3 pr-4 font-medium">
                      {r.descrizione}
                      <div className="text-xs font-normal text-gray-500">
                        {CATEGORIE[r.categoria]} · {r._count.spese} generate
                      </div>
                    </td>
                    <td className="pr-4">
                      {r.unita
                        ? r.unita.nome
                        : `${r.palazzina.nome} (palazzina)`}
                    </td>
                    <td className="pr-4">{FREQ[r.frequenza][0]}</td>
                    <td className="text-right">{eur(r.importo)}</td>
                    <td className="text-right">{eur(annuo(r))}</td>
                    <td className="pl-4 text-xs text-gray-600">
                      {dataIt(r.dal)} → {r.al ? dataIt(r.al) : "senza fine"}
                    </td>
                    <td className="pl-4 text-xs text-gray-600">
                      {p ? (
                        dataIt(p)
                      ) : (
                        <span className="text-gray-400">terminata</span>
                      )}
                    </td>
                    <td className="pl-2">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/spese/ricorrenti/${r.id}/modifica`}
                          className="inline-flex rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                          title="Modifica"
                        >
                          <Pencil size={16} />
                        </Link>
                        <BottoneElimina
                          action={eliminaRicorrente.bind(null, r.id)}
                          messaggio="Eliminare la ricorrenza? Le spese già generate restano nell'elenco."
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
