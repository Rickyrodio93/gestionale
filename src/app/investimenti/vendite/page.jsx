import { dataIt, eur } from "@/lib/format";
import { situazioneVendita } from "@/lib/venditaRateale";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATO = {
  IN_CORSO: ["In corso", "bg-lime-100 text-lime-800"],
  CONCUSA: ["Conclusa", "bg-gray-200 text-gray-700"],
  RISOLTA: ["Risolta", "bg-red-100 text-red-800"],
};

export default async function Vendite() {
  const lista = await prisma.venditaRateale.findMany({
    include: { palazzina: true, unita: true, rate: true, incassi: true },
    orderBy: [{ stato: "asc" }, { dataFirma: "desc" }],
  });
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/investimenti"
            className="flex items-center gap-1 text-xs text-gray-500 hover:underline"
          >
            <ArrowLeft size={16} /> Investimenti
          </Link>
          <h1 className="text-2xl font-bold">Vendite rateali</h1>
        </div>
        <Link
          href="/investimenti/vendite/nuova"
          className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700"
        >
          <Plus size={16} />
          Nuova vendita
        </Link>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        {lista.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nessuna vendita rateale registrata.
          </p>
        ) : (
          <table className="w-full">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="pb-2">Immobile</th>
                <th>Acquirente</th>
                <th className="text-right">Prezzo</th>
                <th className="text-right">Incassato</th>
                <th className="pl-4">Avanzamento</th>
                <th className="pl-4">Prossima rata</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((v) => {
                const s = situazioneVendita(v);
                return (
                  <tr key={v.id} className="border-t border-gray-100 text-sm">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/investimenti/vendite/${v.id}`}
                        className="font-medium hover:underline"
                      >
                        {v.palazzina?.nome ?? v.unita?.nome}
                      </Link>
                      <div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATO[v.stato][1]}`}
                        >
                          {STATO[v.stato][0]}
                        </span>
                      </div>
                    </td>
                    <td className="pr-4">
                      {v.acquirente}
                      <div className="text-xs text-gray-500">
                        firmato il {dataIt(v.dataFirma)}
                      </div>
                    </td>
                    <td className="text-right">{eur(v.prezzo)}</td>
                    <td className="text-right">{eur(s.incassato)}</td>
                    <td className="pl-4">
                      <div className="h-2 w-32 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-lime-600"
                          style={{ width: `${Math.min(100, s.pct * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {(s.pct * 100).toFixed(2)}%
                      </span>
                      {s.arretrato > 0.005 && (
                        <span className="ml-2 text-xs text-red-700">
                          in ritardo {eur(s.arretrato)}
                        </span>
                      )}
                    </td>
                    <td className="pl-4 text-xs text-gray-600">
                      {v.stato === "IN_CORSO" && s.prossima
                        ? `${dataIt(s.prossima.scadenza)} · ${eur(s.prossima.residuo)}`
                        : "-"}
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
