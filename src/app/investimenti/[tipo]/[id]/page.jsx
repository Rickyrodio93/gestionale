import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FormAcquistoVendita from "@/components/FormAcquistoVendita";
import BottoneElimina from "@/components/BottoneElimina";
import { ArrowLeft, Check } from "lucide-react";
import {
  aggiungiStima,
  aggiornaStima,
  eliminaStima,
} from "@/app/investimenti/actions";

export const dynamic = "force-dynamic";

const STIME = {
  MERCATO: "Stima di mercato",
  PERIZIA: "Perizia",
  OMI: "Valori OMI",
};
const iso = (d) => d.toISOString().slice(0, 10);
const mini =
  "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";

export default async function Dettaglio({ params }) {
  const { tipo, id } = await params;
  const n = Number(id);
  if (!["palazzina", "unita"].includes(tipo) || !Number.isInteger(n))
    notFound();

  const ent =
    tipo === "palazzina"
      ? await prisma.palazzina.findUnique({
          where: { id: n },
          include: { valori: { orderBy: { data: "desc" } } },
        })
      : await prisma.unita.findUnique({
          where: { id: n },
          include: { palazzina: true, valori: { orderBy: { data: "desc" } } },
        });
  if (!ent) notFound();

  const eredita =
    tipo === "unita" &&
    ent.palazzina?.prezzoAcquisto != null &&
    ent.prezzoAcquisto == null;
  const stime = ent.valori.filter((v) => STIME[v.tipo]);

  const Opzioni = () =>
    Object.entries(STIME).map(([k, v]) => (
      <option key={k} value={k}>
        {v}
      </option>
    ));

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <Link
          href="/investimenti"
          className="flex items-center gap-1 text-xs text-gray-500 hover:underline"
        >
          <ArrowLeft size={16} /> Investimenti
        </Link>
        <h1 className="text-2xl font-bold">{ent.nome}</h1>
        <Link href={`/investimenti/vendite/nuova?dest=tipo:${n}`} className="text-sm text-indigo-600 hover:underline">
          Registra una vendita rateale (compromesso)
        </Link>
        <p className="text-sm text-gray-500">
          {tipo === "palazzina"
            ? "Intera palazzina"
            : (ent.palazzina?.nome ?? "Unità autonoma")}
        </p>
      </div>

      {eredita && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Questa unità eredita l'acquisto della palazzina. Per l'acquisto vai
          alla{" "}
          <Link
            href={`/investimenti/palazzina/${ent.palazzinaId}`}
            className="underline"
          >
            scheda della palazzina
          </Link>
          . La vendita di una singola unità si può registrare qui: il suo ricavo
          entra nel rendimento della palazzina.
        </p>
      )}

      <FormAcquistoVendita tipo={tipo} id={n} ent={ent} />

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-semibold">Stime di valore</h2>
        <p className="mb-4 text-xs text-gray-500">
          Serve per calcolare il guadagno di un immobile non ancora venduto:
          conta l'ultima stima inserita.
        </p>
        <div>
          {stime.length === 0 && (
            <p className="text-sm text-gray-500">Nessuna stima inserita</p>
          )}
          {stime.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center gap-2">
              <form
                action={aggiornaStima.bind(null, v.id, tipo, n)}
                className="flex flex-wrap items-center gap-2"
              >
                <select name="tipo" defaultValue={v.tipo} className={mini}>
                  <Opzioni />
                </select>
                <input
                  type="date"
                  name="data"
                  defaultValue={iso(v.data)}
                  required
                  className={mini}
                />
                <input
                  type="number"
                  step="0.01"
                  name="importo"
                  defaultValue={v.importo}
                  required
                  className={`${mini} w-36`}
                />
                <input
                  name="fonte"
                  defaultValue={v.fonte ?? ""}
                  placeholder="Fonte"
                  className={`${mini} w-44`}
                />
                <button
                  className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                  title="Salva modifica"
                >
                  <Check size={16} />
                </button>
              </form>
              <BottoneElimina
                action={eliminaStima.bind(null, v.id, tipo, n)}
                messaggio="Eliminare questa stima?"
              />
            </div>
          ))}
        </div>
        <form
          action={aggiungiStima.bind(null, tipo, n)}
          className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4"
        >
          <select name="tipo" className={mini}>
            <Opzioni />
          </select>
          <input
            type="date"
            name="data"
            defaultValue={iso(new Date())}
            required
            className={mini}
          />
          <input
            type="number"
            step="0.01"
            name="importo"
            required
            placeholder="Valore (€)"
            className={`${mini} w-36`}
          />
          <input
            name="fonte"
            placeholder="Fonte (agenzia, perizia)"
            className={`${mini} w-52`}
          />
          <button className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
            Aggiungi stima
          </button>
        </form>
      </section>
    </div>
  );
}
