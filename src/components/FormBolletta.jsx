"use client";
import { useState, useActionState } from "react";
import { creaBolletta, aggiornaBolletta } from "@/app/spese/bollette/actions";
import { inputCls } from "@/lib/ui";
import { METODI, TIPI, ripartisci } from "@/lib/bollette";
import { eur } from "@/lib/format";

const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const n = (v) =>
  v === "" || v == null ? null : Number(String(v).replace(",", "."));
const mini =
  "w-24 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";

export default function FormBolletta({
  palazzine,
  unita,
  contratti,
  ultime,
  bolletta,
}) {
  const [state, action, pending] = useActionState(
    bolletta ? aggiornaBolletta.bind(null, bolletta.id) : creaBolletta,
    null,
  );

  const destOrig = bolletta
    ? bolletta.unitaId
      ? `unita:${bolletta.unitaId}`
      : `palazzina:${bolletta.palazzinaId}`
    : "";
  const [dest, setDest] = useState(destOrig);
  const [tipo, setTipo] = useState(bolletta?.tipo ?? "ACQUA");
  const [metodo, setMetodo] = useState(bolletta?.metodo ?? "A_CARICO");
  const [f, setF] = useState({
    numero: bolletta?.numero ?? "",
    fornitore: bolletta?.fornitore ?? "",
    dal: iso(bolletta?.dal),
    al: iso(bolletta?.al),
    importo: bolletta?.importo ?? "",
    dataPagamento: iso(bolletta?.dataPagamento),
    note: bolletta?.note ?? "",
  });
  const [gen, setGen] = useState({
    li: bolletta?.letturaGenIniziale ?? "",
    lf: bolletta?.letturaGenFinale ?? "",
  });
  const [righe, setRighe] = useState(() =>
    Object.fromEntries(
      (bolletta?.quote ?? []).map((q) => [
        q.contrattoId,
        {
          inc: true,
          persone: q.persone ?? "",
          li: q.letturaIniziale ?? "",
          lf: q.letturaFinale ?? "",
        },
      ]),
    ),
  );

  const [dTipo, dIdStr] = dest.split(":");
  const dId = Number(dIdStr);
  const unitaSel = dTipo === "unita" ? unita.find((u) => u.id === dId) : null;

  const T = (label, name, type = "text", cls = "block") => (
    <label className={cls}>
      <span className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </span>
      <input
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={f[name]}
        onChange={(e) => setF({ ...f, [name]: e.target.value })}
        className={inputCls}
      />
    </label>
  );

  // contratti candidati alla ripartizione
  const inQuote = new Set(
    dest === destOrig ? (bolletta?.quote ?? []).map((q) => q.contrattoId) : [],
  );
  const candidati = contratti.filter((c) => {
    if (inQuote.has(c.id)) return true;
    const inDest =
      dTipo === "palazzina"
        ? c.palazzinaId === dId
        : dTipo === "unita"
          ? c.unitaId === dId
          : false;
    if (!inDest) return false;
    return (
      !f.dal || !f.al || (c.inizio <= f.al && (!c.fine || c.fine >= f.dal))
    );
  });

  const base = (c) => ({
    inc: !bolletta,
    persone: c.persone ?? "",
    li: ultime.unita[`${c.unitaId}:${tipo}`] ?? "",
    lf: "",
  });
  const val = (c) => ({ ...base(c), ...(righe[c.id] ?? {}) });
  const set = (id, patch) =>
    setRighe((p) => ({ ...p, [id]: { ...(p[id] ?? {}), ...patch } }));

  // contatore generale (solo per palazzina)
  const palId = dTipo === "palazzina" ? dId : null;
  const genIni =
    gen.li !== ""
      ? gen.li
      : ((palId && ultime.generali[`${palId}:${tipo}`]) ?? "");
  const genC =
    n(gen.lf) != null && n(genIni) != null ? n(gen.lf) - n(genIni) : null;

  // anteprima
  const sel = candidati.map((c) => ({ c, v: val(c) })).filter((x) => x.v.inc);
  const prev =
    metodo === "A_CARICO" || !n(f.importo)
      ? null
      : ripartisci({
          metodo,
          importo: n(f.importo),
          righe: sel.map(({ c, v }) => ({
            contrattoId: c.id,
            persone: n(v.persone) ?? 0,
            consumo:
              n(v.li) != null && n(v.lf) != null ? n(v.lf) - n(v.li) : null,
          })),
          consumoGenerale: metodo === "CONSUMO" ? genC : null,
        });
  const quotaDi = (id) => prev?.quote?.find((q) => q.contrattoId === id);
  const ripartito = prev?.quote
    ? prev.quote.reduce((t, q) => t + q.importo, 0)
    : 0;

  const card = "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";

  return (
    <form action={action} className="max-w-5xl space-y-5">
      <section className={card}>
        <h2 className="mb-4 font-semibold text-gray-800">Bolletta</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">
              Si riferisce a
            </span>
            <select
              name="destinazione"
              value={dest}
              required
              className={inputCls}
              onChange={(e) => {
                setDest(e.target.value);
                const [t, i] = e.target.value.split(":");
                if (
                  !bolletta &&
                  t === "unita" &&
                  unita.find((u) => u.id === Number(i))?.affittoBreve
                )
                  setMetodo("A_CARICO");
              }}
            >
              <option value="" disabled>
                Scegli…
              </option>
              {palazzine.length > 0 && (
                <optgroup label="Intera palazzina (contatore condiviso)">
                  {palazzine.map((p) => (
                    <option key={p.id} value={`palazzina:${p.id}`}>
                      {p.nome}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Singola unità">
                {unita.map((u) => (
                  <option key={u.id} value={`unita:${u.id}`}>
                    {u.palazzina ? `${u.palazzina} — ` : ""}
                    {u.nome}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">
              Tipo
            </span>
            <select
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className={inputCls}
            >
              {Object.entries(TIPI).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">
              Come si paga
            </span>
            <select
              name="metodo"
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
              className={inputCls}
            >
              {Object.entries(METODI).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          {T("Periodo dal", "dal", "date")}
          {T("Periodo al", "al", "date")}
          {T("Importo (€)", "importo", "number")}
          {T("Fornitore", "fornitore")}
          {T("N° bolletta", "numero")}
          {T("Pagata al fornitore il", "dataPagamento", "date")}
          {T("Note", "note", "text", "block sm:col-span-2 lg:col-span-3")}
        </div>
        {unitaSel?.affittoBreve && (
          <p className="mt-3 text-xs text-gray-500">
            Unità in affitto breve: di norma la bolletta è interamente a tuo
            carico.
          </p>
        )}
      </section>

      {metodo !== "A_CARICO" && (
        <section className={card}>
          <h2 className="mb-1 font-semibold text-gray-800">
            Ripartizione tra gli inquilini
          </h2>
          <p className="mb-4 text-xs text-gray-500">
            Compaiono i contratti lunghi attivi nel periodo. Togli la spunta a
            chi non deve pagare. La quota non è proporzionale ai giorni: se un
            inquilino è subentrato a metà periodo, correggi persone o letture.
          </p>

          {metodo === "CONSUMO" && dTipo === "palazzina" && (
            <div className="mb-4 grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">
                  Contatore generale: lettura iniziale
                </span>
                <input
                  name="genLi"
                  type="number"
                  step="any"
                  value={genIni}
                  onChange={(e) => setGen({ ...gen, li: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">
                  Contatore generale: lettura finale
                </span>
                <input
                  name="genLf"
                  type="number"
                  step="any"
                  value={gen.lf}
                  onChange={(e) => setGen({ ...gen, lf: e.target.value })}
                  className={inputCls}
                />
              </label>
              <p className="self-end text-xs text-gray-500">
                Se compilato, la parte di consumo non attribuita agli inquilini
                resta a tuo carico.
              </p>
            </div>
          )}

          {candidati.length === 0 ? (
            <p className="text-sm text-amber-700">
              Nessun contratto lungo attivo per questa destinazione e questo
              periodo.
            </p>
          ) : (
            <table className="w-full">
              <thead className="text-left text-xs text-gray-500">
                <tr>
                  <th className="pb-2" />
                  <th className="pb-2">Inquilino</th>
                  {metodo === "PERSONE" && <th>Persone</th>}
                  {metodo === "CONSUMO" && (
                    <>
                      <th>Lettura iniziale</th>
                      <th>Lettura finale</th>
                      <th>Consumo</th>
                    </>
                  )}
                  <th className="text-right">Quota</th>
                </tr>
              </thead>
              <tbody>
                {candidati.map((c) => {
                  const v = val(c);
                  const q = v.inc ? quotaDi(c.id) : null;
                  const cons =
                    n(v.li) != null && n(v.lf) != null
                      ? Math.round((n(v.lf) - n(v.li)) * 1000) / 1000
                      : null;
                  return (
                    <tr key={c.id} className="border-t border-gray-100 text-sm">
                      <td className="py-2 pr-3">
                        <input
                          type="checkbox"
                          name={`r${c.id}_inc`}
                          checked={v.inc}
                          onChange={(e) => set(c.id, { inc: e.target.checked })}
                        />
                      </td>
                      <td className="pr-3">
                        {c.inquilino}
                        <div className="text-xs text-gray-500">{c.unita}</div>
                      </td>
                      {metodo === "PERSONE" && (
                        <td className="pr-3">
                          <input
                            name={`r${c.id}_persone`}
                            type="number"
                            value={v.persone}
                            onChange={(e) =>
                              set(c.id, { persone: e.target.value })
                            }
                            className={mini}
                          />
                        </td>
                      )}
                      {metodo === "CONSUMO" && (
                        <>
                          <td className="pr-3">
                            <input
                              name={`r${c.id}_li`}
                              type="number"
                              step="any"
                              value={v.li}
                              onChange={(e) =>
                                set(c.id, { li: e.target.value })
                              }
                              className={mini}
                            />
                          </td>
                          <td className="pr-3">
                            <input
                              name={`r${c.id}_lf`}
                              type="number"
                              step="any"
                              value={v.lf}
                              onChange={(e) =>
                                set(c.id, { lf: e.target.value })
                              }
                              className={mini}
                            />
                          </td>
                          <td className="pr-3 text-gray-600">{cons ?? "—"}</td>
                        </>
                      )}
                      <td className="text-right font-medium">
                        {q ? eur(q.importo) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {prev?.error && (
            <p className="mt-3 text-xs text-amber-700">{prev.error}</p>
          )}
          {prev?.quote && n(f.importo) != null && (
            <p className="mt-3 text-xs text-gray-600">
              Ripartito <b>{eur(ripartito)}</b> · resta a tuo carico{" "}
              <b>{eur(n(f.importo) - ripartito)}</b>
            </p>
          )}
        </section>
      )}

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        disabled={pending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending
          ? "Salvataggio…"
          : bolletta
            ? "Salva modifiche"
            : "Registra bolletta"}
      </button>
    </form>
  );
}
