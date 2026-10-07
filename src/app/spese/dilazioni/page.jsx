import Link from "next/link";
import { Plus } from "lucide-react";
import { dilazioni } from "@/lib/cedolare";
import { eur, dataIt } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Elenco() {
  const lista = await dilazioni();
  const tot = (k) => lista.reduce((t, d) => t + d[k], 0);
  const Card = ({ label, value }) => (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold">{eur(value)}</p>
    </div>
  );

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/spese" className="text-xs text-gray-500 hover:underline">
            ← Spese
          </Link>
          <h1 className="text-2xl font-bold">Dilazioni d'imposta</h1>
        </div>
        <Link
          href="/spese/dilazioni/nuova"
          className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} /> Nuova dilazione
        </Link>
      </div>

      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card label="Ancora da pagare" value={tot("residuo")} />
          <Card label="Già pagato" value={tot("pagato")} />
          <Card
            label="Interessi e sanzioni (totale piani)"
            value={tot("extra")}
          />
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          {lista.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nessuna dilazione registrata.
            </p>
          ) : (
            <table className="w-full">
              <thead className="text-left text-xs text-gray-500">
                <tr>
                  <th className="pb-2">Piano</th>
                  <th className="text-right">Imposta</th>
                  <th className="text-right">Totale rate</th>
                  <th className="text-right">Interessi e sanzioni</th>
                  <th className="text-right">Residuo</th>
                  <th className="pl-4">Prossima rata</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((d) => {
                  const prossima = d.rate.find((r) => !r.pagataIl);
                  return (
                    <tr key={d.id} className="border-t border-gray-100 text-sm">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/spese/dilazioni/${d.id}`}
                          className="font-medium hover:underline"
                        >
                          {d.descrizione}
                        </Link>
                        <div className="text-xs text-gray-500">
                          anno {d.anno} ·{" "}
                          {d.rate.filter((r) => r.pagataIl).length}/
                          {d.rate.length} rate pagate
                        </div>
                      </td>
                      <td className="text-right">{eur(d.impostaOriginaria)}</td>
                      <td className="text-right">{eur(d.totale)}</td>
                      <td className="text-right">{eur(d.extra)}</td>
                      <td className="text-right font-medium">
                        {eur(d.residuo)}
                      </td>
                      <td className="pl-4 text-xs text-gray-600">
                        {prossima ? (
                          `${dataIt(prossima.scadenza)} · ${eur(prossima.importo)}`
                        ) : (
                          <span className="text-green-700">completata</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
