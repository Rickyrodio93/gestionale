"use client";

import { useRouter, useSearchParams } from "next/navigation";

const classe =
  "max-w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";
export default function FiltroSelect({
  nome,
  valore,
  base = "tutti",
  etichetta,
  opzioni,
}) {
  const router = useRouter();
  const sp = useSearchParams();

  function cambia(e) {
    const p = new URLSearchParams(sp.toString());
    if (e.target.value === base) p.delete(nome);
    else p.set(nome, e.target.value);
    const q = p.toString();
    router.push(q ? `?${q}` : "?");
  }

  const gruppi = [];
  for (const o of opzioni) {
    const g = o.gruppo ?? "";
    let x = gruppi.find((y) => y.nome === g);
    if (!x) {
      x = { nome: g, voci: [] };
      gruppi.push(x);
    }
    x.voci.push(o);
  }
  return (
    <label className="flex items-center gap-2">
      {etichetta && (
        <span className="text-xs font-medium text-gray-600">{etichetta}</span>
      )}
      <select value={valore} onChange={cambia} className={classe}>
        {gruppi.map((g) =>
          g.nome ? (
            <optgroup key={g.nome} label={g.nome}>
              {g.voci.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ) : (
            g.voci.map((o) => (
              <optgroup key={o.value} value={o.value}>
                {o.label}
              </optgroup>
            ))
          ),
        )}
      </select>
    </label>
  );
}
