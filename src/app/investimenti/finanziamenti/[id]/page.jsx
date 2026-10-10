import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { eur, dataIt } from "@/lib/format";
import { riepilogoFinanziamento, SCOPI } from "@/lib/finanziamento";
import FormFinanziamento from "@/components/FormFinanziamento";
import BottoneElimina from "@/components/BottoneElimina";
import { eliminaFinanziamento } from "../actions";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

const card = "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";
const Dato = ({ label, value, tono }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`text-lg font-semibold ${tono ?? ""}`}>{value}</p>
  </div>
);

export default async function Scheda({ params }) {
  const { id } = await params;
  if (!Number.isInteger(Number(id))) notFound();
  const f = await prisma.finanziamento.findUnique({
    where: { id: Number(id) },
    include: { palazzina: true, unita: { include: { palazzina: true } } },
  });
  if (!f) notFound();

  const r = riepilogoFinanziamento(f);
  const oggi = new Date();
  const palazzine = await prisma.palazzina.findMany({
    orderBy: { nome: "asc" },
  });
  const unitaDb = await prisma.unita.findMany({
    include: { palazzina: true },
    orderBy: { nome: "asc" },
  });
  const costoCredito = r.interessiTotali + (f.speseIniziali ?? 0);

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/investimenti/finanziamenti"
            className="flex items-center gap-1 text-xs text-gray-500 hover:underline"
          >
            <ArrowLeft size={16} /> Finanziamenti
          </Link>
          <h1 className="text-2xl font-bold">{f.descrizione}</h1>
          <p className="text-sm text-gray-500">
            {f.palazzina?.nome ?? f.unita?.nome} · {SCOPI[f.scopo]} · erogato il{" "}
            {dataIt(f.dataErogazione)}
            {f.ricorrenteId && (
              <>
                {" "}
                · rate tracciate nelle{" "}
                <Link
                  href={`/spese/ricorrenti/${f.ricorrenteId}/modifica`}
                  className="text-indigo-600 hover:underline"
                >
                  spese ricorrenti
                </Link>
              </>
            )}
          </p>
        </div>
        <BottoneElimina
          action={eliminaFinanziamento.bind(null, f.id)}
          messaggio="Eliminare il finanziamento? La ricorrenza delle rate e le spese già registrate restano."
        />
      </div>

      <section className={card}>
        <div className="grid gap-4 sm:grid-cols-4">
          <Dato label="Capitale erogato" value={eur(f.importo)} />
          <Dato
            label="Tasso nominale annuo"
            value={
              f.tassoAnnuo != null
                ? `${f.tassoAnnuo.toFixed(3).replace(".", ",")}%`
                : "—"
            }
          />
          <Dato
            label="Rata"
            value={`${eur(f.rata)}${f.frequenzaMesi > 1 ? ` ogni ${f.frequenzaMesi} mesi` : " al mese"}`}
          />
          <Dato
            label="Rate"
            value={`${r.ratePagate} pagate su ${f.numeroRate}`}
          />
        </div>
        <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-4">
          <Dato label="Debito residuo" value={eur(r.debitoResiduo)} />
          <Dato label="Capitale restituito" value={eur(r.capitalePagato)} />
          <Dato label="Interessi pagati" value={eur(r.interessiPagati)} />
          <Dato
            label="Interessi ancora da pagare"
            value={eur(r.interessiTotali - r.interessiPagati)}
          />
        </div>
        <p className="mt-4 text-sm text-gray-700">
          Costo totale del credito: <b>{eur(costoCredito)}</b> (
          {eur(r.interessiTotali)} di interessi
          {f.speseIniziali
            ? ` + ${eur(f.speseIniziali)} di spese iniziali`
            : ""}
          ), cioè il{" "}
          {((costoCredito / f.importo) * 100).toFixed(1).replace(".", ",")}% del
          capitale. Pagherai in tutto {eur(r.costoTotale)}.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Piano a rata costante e tasso fisso, ricavato dai dati inseriti: se la
          banca applica un tasso variabile o un preammortamento, le quote
          possono differire.
        </p>
      </section>

      <section className={card}>
        <h2 className="mb-3 font-semibold">Piano di ammortamento</h2>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-white text-left text-xs text-gray-500">
              <tr>
                <th className="pb-2">N°</th>
                <th>Data</th>
                <th className="text-right">Rata</th>
                <th className="text-right">Quota capitale</th>
                <th className="text-right">Quota interessi</th>
                <th className="text-right">Debito residuo</th>
              </tr>
            </thead>
            <tbody>
              {r.righe.map((x) => (
                <tr
                  key={x.n}
                  className={`border-t border-gray-100 text-sm ${x.data <= oggi ? "text-gray-500" : ""}`}
                >
                  <td className="py-1.5">{x.n}</td>
                  <td>{dataIt(x.data)}</td>
                  <td className="text-right">{eur(x.rata)}</td>
                  <td className="text-right">{eur(x.capitale)}</td>
                  <td className="text-right">{eur(x.interessi)}</td>
                  <td className="text-right">{eur(x.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Le rate in grigio sono già scadute.
        </p>
      </section>

      <section className={card}>
        <h2 className="mb-4 font-semibold">Modifica</h2>
        <FormFinanziamento
          palazzine={palazzine.map((p) => ({ id: p.id, nome: p.nome }))}
          unita={unitaDb.map((u) => ({
            id: u.id,
            nome: u.nome,
            palazzina: u.palazzina?.nome ?? null,
          }))}
          finanziamento={f}
        />
      </section>
    </div>
  );
}
