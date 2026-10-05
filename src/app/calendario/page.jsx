import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { dataIt } from "@/lib/format";
import { eventiCalendario, TIPI_EVENTO } from "@/lib/eventi";
import { sincronizzaTutte } from "@/lib/sincronizzaIcal";
import { sincronizzaOra } from "./actions";

export const dynamic = "force-dynamic";

const g = (d) => d.toISOString().slice(0, 10);
const GIORNI = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MAX = 3;

export default async function Calendario({ searchParams }) {
  const sp = await searchParams;
  await sincronizzaTutte(); // solo se l'ultimo aggiornamento ha più di 30 minuti

  const eventi = await eventiCalendario();
  const unitaBrevi = await prisma.unita.findMany({
    where: { affittoBreve: true, dataVendita: null },
    orderBy: { nome: "asc" },
  });

  const ora = new Date();
  const oggiStr = ora.toLocaleDateString("sv-SE");
  const m = /^(\d{4})-(\d{2})$/.exec(sp.mese ?? "");
  const anno = m ? +m[1] : ora.getFullYear();
  const mese = m ? +m[2] - 1 : ora.getMonth();

  const primo = new Date(Date.UTC(anno, mese, 1));
  const ultimo = new Date(Date.UTC(anno, mese + 1, 0));
  const offset = (primo.getUTCDay() + 6) % 7; // settimana da lunedì
  const celle = Math.ceil((offset + ultimo.getUTCDate()) / 7) * 7;
  const giorni = Array.from(
    { length: celle },
    (_, i) => new Date(Date.UTC(anno, mese, 1 - offset + i)),
  );

  const linkMese = (delta) => {
    const d = new Date(Date.UTC(anno, mese + delta, 1));
    return `/calendario?mese=${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const titolo = primo.toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const limite = g(new Date(Date.now() + 60 * 86400000));
  const prossimi = eventi
    .filter((e) => e.fine > oggiStr && e.inizio <= limite)
    .slice(0, 30);
  const periodo = (e) =>
    e.tipo === "prenotazione" || e.tipo === "occupato"
      ? `${dataIt(e.inizio)} → ${dataIt(e.fine)}`
      : dataIt(e.inizio);

  const btn =
    "inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50";

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Calendario</h1>
        <div className="flex gap-2">
          {unitaBrevi.some((u) => u.icalUrl) && (
            <form action={sincronizzaOra}>
              <button className={btn}>
                <RefreshCw size={14} /> Sincronizza
              </button>
            </form>
          )}
          <Link
            href="/calendario/prenotazioni/nuova"
            className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus size={16} /> Nuova prenotazione
          </Link>
        </div>
      </div>

      <div className="space-y-5">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold capitalize">{titolo}</h2>
            <div className="flex items center gap-1">
              <Link
                href={linkMese(-1)}
                className="rounded-md p-1.5 hover:bg-gray-100"
                title="Mese precedente"
              >
                <ChevronLeft size={18} />
              </Link>
              <Link
                href="/calendario"
                className="rounded-md px-2 py-1 text-sm hover:bg-gray-100"
              >
                Oggi
              </Link>
              <Link
                href={linkMese(1)}
                className="rounded-md p-1.5 hover:bg-gray-100"
                title="Mese successivo"
              >
                <ChevronRight size={18} />
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center text-xs font-medium text-gray-500">
              {GIORNI.map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {giorni.map((d) => {
                const s = g(d);
                const fuori = d.getUTCMonth() !== mese;
                const evs = eventi.filter((e) => e.inizio <= s && s < e.fine);
                return (
                  <div
                    key={s}
                    className={`min-h-24 border-b border-r border-gray-100 p-1.5 ${fuori ? "bg-gray-50" : ""}`}
                  >
                    <div
                      className={`mb-1 text-xs ${
                        s === oggiStr
                          ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white"
                          : fuori
                            ? "text-gray-300"
                            : "text-gray-500"
                      }`}
                    >
                      {d.getUTCDate()}
                    </div>
                    <div className="space-y-0.5">
                      {evs.slice(0, MAX).map((e) => (
                        <Link
                          key={e.id}
                          href={e.link}
                          className={`block truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${TIPI_EVENTO[e.tipo][1]}`}
                        >
                          {e.titolo}
                        </Link>
                      ))}
                      {evs.length > MAX && (
                        <p className="px-1 text-[11px] text-gray-500">
                          +{evs.length - MAX} altri
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {Object.values(TIPI_EVENTO).map(([nome, cls]) => (
              <span
                key={nome}
                className={`rounded px-2 py-0.5 text-[11px] font-medium ${cls}`}
              >
                {nome}
              </span>
            ))}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">Prossimi 60 giorni</h2>
            {prossimi.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nessun evento in programma.
              </p>
            ) : (
              <ul className="space-y-2">
                {prossimi.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <Link href={e.link} className="hover:underline">
                      <span className="text-gray-500">{periodo(e)}</span> ·{" "}
                      {e.titolo}
                    </Link>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${TIPI_EVENTO[e.tipo][1]}`}
                    >
                      {TIPI_EVENTO[e.tipo][0]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">
              Affitti brevi: aggiornamento calendari
            </h2>
            {unitaBrevi.lenght === 0 ? (
              <p className="text-sm text-gray-500">
                Nessuna unità segnata come affitto breve: spunta l'opzione da
                Appartamenti → Modifica.
              </p>
            ) : (
              <ul className="space-y-2">
                {unitaBrevi.map((u) => (
                  <li
                    key={u.id}
                    className="flex flex-wrap justify-between gap-2 text-sm"
                  >
                    <span className="font-medium">{u.nome}</span>
                    <span className="text-xs text-gray-500">
                      {!u.icalUrl ? (
                        "nessun link iCal"
                      ) : u.icalErrore ? (
                        <span className="text-red-700">
                          errore: {u.icalErrore}
                        </span>
                      ) : u.icalSincronizzato ? (
                        `aggiornato il ${u.icalSincronizzato.toLocaleString("it-IT")}`
                      ) : (
                        "mai sincronizzato"
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
