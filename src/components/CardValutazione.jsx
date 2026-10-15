"use client";
import { useMemo, useState, useActionState } from "react";
import { salvaStimaOmi } from "@/app/investimenti/valutazione/actions";
import { inputCls } from "@/lib/ui";
import { eur, dataIt } from "@/lib/format";

const ORDINE = { ottimo: 0, normale: 1, scadente: 2 };
const ordina = (a) =>
  [...a].sort(
    (x, y) =>
      (ORDINE[x.toLowerCase()] ?? 9) - (ORDINE[y.toLowerCase()] ?? 9) ||
      x.localeCompare(y, "it"),
  );
const n = (v) =>
  v === "" || v == null ? null : Number(String(v).replace(",", "."));

function tipologiaDefault(tipoUnita, lista) {
  const cerca = (re) => lista.find((t) => re.test(t));
  if (tipoUnita === "VILLA")
    return cerca(/ville/i) ?? cerca(/civil/i) ?? lista[0];
  if (tipoUnita === "APPARTAMENTO")
    return cerca(/abitazioni civili/i) ?? cerca(/abitazion/i) ?? lista[0];
  return lista[0];
}

// date zona, tipologia e stato (anche parziali) restituisce la combinazione valida e i prezzi
function risolvi(quote, tipoUnita, z, t, s) {
  const tipi = [
    ...new Set(quote.filter((q) => q.zona === z).map((q) => q.tipologia)),
  ];
  const tt = tipi.includes(t) ? t : (tipologiaDefault(tipoUnita, tipi) ?? "");
  const ss = ordina([
    ...new Set(
      quote
        .filter((q) => q.zona === z && q.tipologia === tt)
        .map((q) => q.stato),
    ),
  ]);
  const st = ss.includes(s)
    ? s
    : (ss.find((x) => /normale/i.test(x)) ?? ss[0] ?? "");
  const q = quote.find(
    (x) => x.zona === z && x.tipologia === tt && x.stato === st,
  );
  return {
    tipologia: tt,
    stato: st,
    min: q ? String(q.min) : "",
    max: q ? String(q.max) : "",
  };
}

export default function CardValutazione({ u, quote, semestre }) {
  const [state, action, pending] = useActionState(
    salvaStimaOmi.bind(null, u.id),
    null,
  );
  const haQuote = quote.length > 0;

  const iniz =
    haQuote && u.omi.zona
      ? risolvi(
          quote,
          u.tipo,
          u.omi.zona,
          u.omi.tipologia ?? "",
          u.omi.stato ?? "",
        )
      : null;
  const [zona, setZona] = useState(u.omi.zona ?? "");
  const [tipologia, setTipologia] = useState(
    iniz?.tipologia ?? u.omi.tipologia ?? "",
  );
  const [stato, setStato] = useState(iniz?.stato ?? u.omi.stato ?? "");
  const [min, setMin] = useState(iniz?.min ?? "");
  const [max, setMax] = useState(iniz?.max ?? "");

  const zone = useMemo(() => {
    const m = new Map();
    quote.forEach((q) => m.set(q.zona, q.zonaDescr));
    return [...m].sort((a, b) =>
      a[0].localeCompare(b[0], "it", { numeric: true }),
    );
  }, [quote]);
  const tipologie = useMemo(
    () => [
      ...new Set(quote.filter((q) => q.zona === zona).map((q) => q.tipologia)),
    ],
    [quote, zona],
  );
  const stati = useMemo(
    () =>
      ordina([
        ...new Set(
          quote
            .filter((q) => q.zona === zona && q.tipologia === tipologia)
            .map((q) => q.stato),
        ),
      ]),
    [quote, zona, tipologia],
  );

  function scegli(z, t, s) {
    const r = risolvi(quote, u.tipo, z, t, s);
    setZona(z);
    setTipologia(r.tipologia);
    setStato(r.stato);
    if (r.min) {
      setMin(r.min);
      setMax(r.max);
    }
  }

  const sup = u.superficie;
  const mn = n(min);
  const mx = n(max);
  const valido = sup > 0 && mn > 0 && mx >= mn;
  const stima = valido
    ? { min: sup * mn, med: (sup * (mn + mx)) / 2, max: sup * mx }
    : null;
  const netta =
    quote.find(
      (q) => q.zona === zona && q.tipologia === tipologia && q.stato === stato,
    )?.superficie === "N";

  const Sel = ({ label, value, onChange, opzioni, name }) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </span>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={inputCls}
      >
        <option value="" disabled>
          Scegli…
        </option>
        {opzioni.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <form
      action={action}
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <input type="hidden" name="semestre" value={semestre ?? ""} />
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{u.nome}</h3>
          <p className="text-xs text-gray-500">
            {sup ? `${sup} m² catastali` : "superficie catastale mancante"}
            {u.catastale != null && ` · valore catastale ${eur(u.catastale)}`}
          </p>
        </div>
        {u.ultima && (
          <p className="text-right text-xs text-gray-500">
            Stima salvata:{" "}
            <b className="text-gray-800">{eur(u.ultima.importo)}</b>
            <br />
            del {dataIt(u.ultima.data)}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {haQuote ? (
          <>
            <Sel
              label="Zona OMI"
              name="zona"
              value={zona}
              onChange={(e) => scegli(e.target.value, tipologia, stato)}
              opzioni={zone.map(([z, d]) => [z, d ? `${z} — ${d}` : z])}
            />
            <Sel
              label="Tipologia"
              name="tipologia"
              value={tipologia}
              onChange={(e) => scegli(zona, e.target.value, stato)}
              opzioni={tipologie.map((t) => [t, t])}
            />
            <Sel
              label="Stato di conservazione"
              name="stato"
              value={stato}
              onChange={(e) => scegli(zona, tipologia, e.target.value)}
              opzioni={stati.map((s) => [s, s])}
            />
          </>
        ) : (
          [
            ["Zona OMI", "zona", zona, setZona],
            ["Tipologia", "tipologia", tipologia, setTipologia],
            ["Stato di conservazione", "stato", stato, setStato],
          ].map(([l, nome, v, set]) => (
            <label key={nome} className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                {l}
              </span>
              <input
                name={nome}
                value={v}
                onChange={(e) => set(e.target.value)}
                className={inputCls}
              />
            </label>
          ))
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Minimo (€/m²)
          </span>
          <input
            name="min"
            type="number"
            step="0.01"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">
            Massimo (€/m²)
          </span>
          <input
            name="max"
            type="number"
            step="0.01"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>
      {!haQuote && (
        <p className="mt-2 text-xs text-gray-500">
          Nessun dato importato per questo comune: leggi minimo e massimo dalla
          consultazione OMI e scrivili qui.
        </p>
      )}
      {netta && (
        <p className="mt-2 text-xs text-amber-700">
          Questa quotazione è riferita alla superficie netta: con la superficie
          catastale il valore può risultare sovrastimato di qualche punto
          percentuale.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        {stima ? (
          <div>
            <p className="text-xs text-gray-500">Valore teorico</p>
            <p className="text-xl font-semibold">{eur(stima.med)}</p>
            <p className="text-xs text-gray-500">
              tra {eur(stima.min)} e {eur(stima.max)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            {sup
              ? "Scegli zona, tipologia e stato per calcolare il valore."
              : "Serve la superficie catastale (Appartamenti → Modifica)."}
          </p>
        )}
        <div className="text-right">
          <button
            disabled={pending || !stima}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {pending ? "Salvataggio…" : "Salva stima"}
          </button>
          {state?.error && (
            <p className="mt-1 text-xs text-red-700">{state.error}</p>
          )}
          {state?.ok && (
            <p className="mt-1 text-xs text-green-700">
              Salvata: {eur(state.importo)}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
