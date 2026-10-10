import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { eur, dataIt } from "@/lib/format";
import { riepilogoFinanziamento, SCOPI } from "@/lib/finanziamento";

export const dynamic = "force-dynamic";

export default async function Finanziamenti() {
  const lista = await prisma.finanziamento.findMany({
    include: { palazzina: true, unita: true },
    orderBy: { dataErogazione: "asc" },
  });
  const righe = lista.map((f) => ({ f, r: riepilogoFinanziamento(f) }));
  const tot = (fn) => righe.reduce((t, x) => t + fn(x), 0);

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
          <Link
            href="/investimenti"
            className="flex items-center gap-1 text-xs text-gray-500 hover:underline"
          >
            <ArrowLeft size={16} /> Investimenti
          </Link>
          <h1 className="text-2xl font-bold">Finanziamenti</h1>
        </div>
        <Link
          href="/investimenti/finanziamenti/nuovo"
          className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} /> Nuovo finanziamento
        </Link>
      </div>

      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-4">
          <Card label="Debito residuo" value={tot((x) => x.r.debitoResiduo)} />
          <Card
            label="Rata mensile equivalente"
            value={tot((x) => x.f.rata / x.f.frequenzaMesi)}
          />
          <Card
            label="Interessi pagati"
            value={tot((x) => x.r.interessiPagati)}
          />
          <Card
            label="Interessi ancora da pagare"
            value={tot((x) => x.r.interessiTotali - x.r.interessiPagati)}
          />
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          {righe.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nessun finanziamento registrato.
            </p>
          ) : (
            <table className="w-full">
              <thead className="text-left text-xs text-gray-500">
                <tr>
                  <th className="pb-2">Finanziamento</th>
                  <th className="text-right">Capitale</th>
                  <th className="text-right">Tasso</th>
                  <th className="text-right">Rata</th>
                  <th className="pl-4">Rate pagate</th>
                  <th className="text-right">Interessi pagati</th>
                  <th className="text-right">Debito residuo</th>
                  <th className="pl-4">Fine</th>
                </tr>
              </thead>
              <tbody>
                {righe.map(({ f, r }) => (
                  <tr key={f.id} className="border-t border-gray-100 text-sm">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/investimenti/finanziamenti/${f.id}`}
                        className="font-medium hover:underline"
                      >
                        {f.descrizione}
                      </Link>
                      <div className="text-xs text-gray-500">
                        {f.palazzina?.nome ?? f.unita?.nome} · {SCOPI[f.scopo]}
                      </div>
                    </td>
                    <td className="text-right">{eur(f.importo)}</td>
                    <td className="text-right">
                      {f.tassoAnnuo != null
                        ? `${f.tassoAnnuo.toFixed(2).replace(".", ",")}%`
                        : "—"}
                    </td>
                    <td className="text-right">{eur(f.rata)}</td>
                    <td className="pl-4 text-xs text-gray-600">
                      {r.ratePagate}/{f.numeroRate}
                    </td>
                    <td className="text-right">{eur(r.interessiPagati)}</td>
                    <td className="text-right font-medium">
                      {eur(r.debitoResiduo)}
                    </td>
                    <td className="pl-4 text-xs text-gray-600">
                      {dataIt(r.finePiano)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
