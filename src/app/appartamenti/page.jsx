import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { statoScadenza, coloriScadenza, etichetta } from "@/lib/scadenze";
import { dataIt } from "@/lib/format";

export const dynamic = "force-dynamic";

const includeUnita = {
  catasto: true,
  contratti: {
    // where: {dataVendita: null},
    where: { tipo: "LUNGO" },
    include: { inquilino: true },
    orderBy: { dataInizio: "desc" },
    take: 1,
  },
};

function Riga({ u }) {
  const c0 = u.contratti[0];
  const s0 = c0 && statoScadenza(c0);
  const concluso = s0 && ["concluso", "rinnovato"].includes(s0.livello);
  const c = c0 && !concluso ? c0 : null; // contratto concluso = unità libera
  const s = c ? s0 : null;
  return (
    <tr className="border-t border-gray-100 text-sm">
      <td className="py-3 pr-4 font-medium">
        {u.nome}
        <div className="text-xs font-normal text-gray-500">
          {u.tipo.toLowerCase()}
        </div>
      </td>
      <td className="pr-4">
        {c?.inquilino.nome ?? <span className="text-gray-400">libera</span>}
      </td>
      <td className="pr-4">
        {s ? (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${coloriScadenza[s.livello]}`}
          >
            {etichetta(s)}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="pr-4">
        {u.catasto ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            completo
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            mancante
          </span>
        )}
      </td>
      <td className="text-right">
        <Link
          href={`/appartamenti/${u.id}/modifica`}
          className="inline-flex rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
          title="Modifica"
        >
          <Pencil size={16} />
        </Link>
      </td>
    </tr>
  );
}

function Blocco({ titolo, sotto, unita }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3">
        <h2 className="font-semibold">{titolo}</h2>
        <p className="text-xs text-gray-500">
          {[sotto, `${unita.length} unità`].filter(Boolean).join(" · ")}
        </p>
      </div>
      <table className="w-full">
        <thead className="text-left text-xs text-gray-500">
          <tr>
            <th className="pb-2">Unità</th>
            <th>Inquilino</th>
            <th>Scadenza</th>
            <th>Catasto</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {unita.map((u) => (
            <Riga key={u.id} u={u} />
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default async function Appartamenti() {
  const palazzine = await prisma.palazzina.findMany({
    orderBy: { nome: "asc" },
    include: { unita: { where: { dataVendita: null }, include: includeUnita } },
  });
  const autonome = await prisma.unita.findMany({
    where: { palazzinaId: null, dataVendita: null },
    include: includeUnita,
  });

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Appartamenti</h1>
        <Link
          href="/appartamenti/nuovo"
          className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} /> Nuovo
        </Link>
      </div>
      <div className="space-y-5">
        {palazzine.map((p) => (
          <Blocco
            key={p.id}
            titolo={p.nome}
            sotto={p.indirizzo}
            unita={p.unita}
          />
        ))}
        {autonome.length > 0 && (
          <Blocco titolo="Unità autonome" unita={autonome} />
        )}
      </div>
    </>
  );
}
