import { StatCard, Card, Badge } from "./ui.jsx";
import { formatEuro, formatDate, CATEGORIE_SPESA } from "./store.js";

export default function Dashboard({ data }) {
  const immobili = data.immobili || [];
  const spese = data.spese || [];
  const rendite = data.rendite || [];
  const lavori = data.lavori || [];

  // Totali
  const totaleSpese = spese.reduce((a, s) => a + Number(s.importo || 0), 0);

  const totaleRendite = rendite.reduce((acc, r) => {
    if (r.tipo === "lungo") return acc + Number(r.importo || 0);
    if (r.tipo === "breve")
      return (
        acc +
        (r.prenotazioni || []).reduce((a, p) => a + Number(p.totale || 0), 0)
      );
    return acc;
  }, 0);

  const nettoGlobale = totaleRendite - totaleSpese;
  const totalelavori = lavori.reduce(
    (a, l) =>
      a +
      (l.voci || []).reduce(
        (b, v) => b + Number(v.quantita || 0) * Number(v.prezzoUnitario || 0),
        0,
      ),
    0,
  );

  // Recenti
  const speseRecenti = [...spese]
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 5);

  // Affitti questo mese
  const meseCorrente = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();
  const affittiNonPagati = rendite.filter(
    (r) => r.tipo === "lungo" && !(r.pagamenti || []).includes(meseCorrente),
  );

  // Lavori in corso
  const lavoriAttivi = lavori.filter((l) => l.stato === "in_corso");

  const nomeImm = (id) => immobili.find((i) => i.id === id)?.nome || "—";
  const catInfo = (val) =>
    CATEGORIE_SPESA.find((c) => c.value === val) || { emoji: "📌", label: val };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="serif text-4xl mb-1">Buongiorno 👋</h1>
        <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>
          {new Date().toLocaleDateString("it-IT", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {" · "}
          {immobili.length} immobili nel portfolio
        </p>
      </div>

      {/* KPIs */}
      <div
        className="grid grid-cols-2 gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
      >
        <StatCard
          label="Rendite totali"
          value={formatEuro(totaleRendite)}
          color="var(--c-green)"
        />
        <StatCard
          label="Spese totali"
          value={formatEuro(totaleSpese)}
          color="var(--c-accent)"
        />
        <StatCard
          label="Saldo netto"
          value={formatEuro(nettoGlobale)}
          color={nettoGlobale >= 0 ? "var(--c-green)" : "#dc2626"}
        />
        <StatCard
          label="Investimenti lavori"
          value={formatEuro(totalelavori)}
          color="var(--c-yellow)"
          sub={`${lavori.length} lavori totali`}
        />
      </div>

      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
      >
        {/* Alert affitti non pagati */}
        {affittiNonPagati.length > 0 && (
          <Card style={{ borderColor: "#fca5a5", background: "#fff1f1" }}>
            <div className="font-600 mb-3 flex items-center gap-2">
              <span>⚠️</span> Canoni non registrati questo mese
            </div>
            <div className="flex flex-col gap-2">
              {affittiNonPagati.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="font-500">{r.inquilino}</span>
                    <span
                      className="ml-2"
                      style={{ color: "var(--c-text-muted)" }}
                    >
                      {nomeImm(r.immobileId)}
                    </span>
                  </div>
                  <span
                    className="font-600"
                    style={{ color: "var(--c-accent)" }}
                  >
                    {formatEuro(r.importo)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Lavori in corso */}
        {lavoriAttivi.length > 0 && (
          <Card style={{ borderColor: "#fde68a", background: "#fffbeb" }}>
            <div className="font-600 mb-3 flex items-center gap-2">
              <span>🔨</span> Cantieri in corso
            </div>
            <div className="flex flex-col gap-2">
              {lavoriAttivi.map((l) => {
                const tot = (l.voci || []).reduce(
                  (a, v) =>
                    a + Number(v.quantita || 0) * Number(v.prezzoUnitario || 0),
                  0,
                );
                return (
                  <div
                    key={l.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <span className="font-500">{l.titolo}</span>
                      <span
                        className="ml-2"
                        style={{ color: "var(--c-text-muted)" }}
                      >
                        {nomeImm(l.immobileId)}
                      </span>
                    </div>
                    <span
                      className="font-600"
                      style={{ color: "var(--c-yellow)" }}
                    >
                      {formatEuro(tot)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Ultime spese */}
        <Card>
          <div className="font-600 mb-3">📋 Ultime spese</div>
          {speseRecenti.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>
              Nessuna spesa registrata.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {speseRecenti.map((s) => {
                const cat = catInfo(s.categoria);
                return (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    <span>{cat.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-500">{cat.label}</span>
                      {s.fornitore && (
                        <span
                          className="ml-1"
                          style={{ color: "var(--c-text-muted)" }}
                        >
                          {s.fornitore}
                        </span>
                      )}
                      <span
                        className="ml-1 text-xs"
                        style={{ color: "var(--c-text-muted)" }}
                      >
                        · {nomeImm(s.immobileId)}
                      </span>
                    </div>
                    <span
                      className="font-600 shrink-0"
                      style={{ color: "var(--c-accent)" }}
                    >
                      {formatEuro(s.importo)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Immobili */}
        <Card>
          <div className="font-600 mb-3">🏠 Portfolio</div>
          <div className="flex flex-col gap-3">
            {immobili.map((imm) => {
              const entrate = rendite
                .filter((r) => r.immobileId === imm.id)
                .reduce((acc, r) => {
                  if (r.tipo === "lungo") return acc + Number(r.importo || 0);
                  return (
                    acc +
                    (r.prenotazioni || []).reduce(
                      (a, p) => a + Number(p.totale || 0),
                      0,
                    )
                  );
                }, 0);
              const uscite = spese
                .filter((s) => s.immobileId === imm.id)
                .reduce((a, s) => a + Number(s.importo || 0), 0);
              const netto = entrate - uscite;
              return (
                <div
                  key={imm.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <div className="font-500">{imm.nome}</div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--c-text-muted)" }}
                    >
                      {imm.tipo}
                      {imm.mq ? ` · ${imm.mq}mq` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="font-600"
                      style={{
                        color: netto >= 0 ? "var(--c-green)" : "#dc2626",
                      }}
                    >
                      {formatEuro(netto)}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--c-text-muted)" }}
                    >
                      saldo netto
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
