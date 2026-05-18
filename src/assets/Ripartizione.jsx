import { useState, useRef } from "react";
import {
  Modal,
  Field,
  Input,
  Select,
  Textarea,
  Btn,
  Card,
  StatCard,
  EmptyState,
  useConfirm,
} from "./ui.jsx";
import { CATEGORIE_SPESA, formatEuro, formatDate } from "./store.js";
import { ChevronDown, ChevronUp, Trash, Trash2 } from "lucide-react";

/* ── Upload bolletta con parsing AI ── */
function BollettaUploader({ onDatiEstratti }) {
  const [stato, setStato] = useState("idle");
  const [msg, setMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setStato("loading");
    setMsg("Lettura bolletta in corso...");
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = () => rej(new Error("Errore lettura file"));
        r.readAsDataURL(file);
      });
      const isPDF = file.type === "application/pdf";
      const resp = await fetch("/api/anthropic/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: isPDF ? "document" : "image",
                  source: {
                    type: "base64",
                    media_type: file.type,
                    data: base64,
                  },
                },
                {
                  type: "text",
                  text: `Analizza questa bolletta italiana ed estrai le informazioni. Rispondi SOLO con JSON senza markdown:\n{"fornitore":"","tipo":"luce|gas|acqua|altro","importoTotale":0,"periodo":"","dataScadenza":"YYYY-MM-DD o vuoto","consumo":0,"unitaMisura":"kWh|mc|l|altro","note":""}`,
                },
              ],
            },
          ],
        }),
      });
      const data = await resp.json();
      const text = (data.content || []).map((c) => c.text || "").join("");
      const estratti = JSON.parse(text.replace(/```json|```/g, "").trim());
      setStato("done");
      setMsg(
        `✓ ${estratti.fornitore || "Bolletta"} · ${formatEuro(estratti.importoTotale)}`,
      );
      onDatiEstratti({ ...estratti, fileName });
    } catch (err) {
      setStato("error");
      setMsg(`Errore: ${err.message}`);
    }
  };

  const st = {
    idle: { border: "var(--c-border)", bg: "var(--c-surface-alt)", icon: "📄" },
    loading: {
      border: "var(--c-border)",
      bg: "var(--c-surface-alt)",
      icon: "⏳",
    },
    done: { border: "var(--c-green)", bg: "var(--c-green-soft)", icon: "✅" },
    error: { border: "#dc2626", bg: "#fff1f1", icon: "❌" },
  }[stato];

  return (
    <div>
      <div
        onClick={() => stato !== "loading" && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files[0]);
        }}
        style={{
          border: `2px dashed ${st.border}`,
          borderRadius: 12,
          padding: "22px 16px",
          textAlign: "center",
          cursor: stato === "loading" ? "not-allowed" : "pointer",
          background: st.bg,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <div style={{ fontSize: 26, marginBottom: 6 }}>{st.icon}</div>
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: "var(--c-text)",
            marginBottom: 3,
          }}
        >
          {stato === "idle" ? "Carica bolletta PDF o immagine" : fileName}
        </div>
        <div
          style={{
            fontSize: 12,
            color:
              stato === "error"
                ? "#dc2626"
                : stato === "done"
                  ? "var(--c-green)"
                  : "var(--c-text-muted)",
          }}
        >
          {stato === "idle"
            ? "Trascina qui o clicca · i dati vengono estratti automaticamente"
            : msg}
        </div>
        {stato === "loading" && (
          <div
            style={{
              marginTop: 10,
              height: 3,
              borderRadius: 2,
              background: "var(--c-border)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: "var(--c-accent)",
                borderRadius: 2,
                width: "60%",
                marginLeft: "20%",
              }}
            />
          </div>
        )}
      </div>
      {(stato === "done" || stato === "error") && (
        <button
          onClick={() => {
            setStato("idle");
            setMsg("");
            setFileName("");
          }}
          style={{
            marginTop: 6,
            fontSize: 11,
            color: "var(--c-text-muted)",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ↩ Carica un altro file
        </button>
      )}
    </div>
  );
}

/* ── Form ripartizione (3 step) ── */
function RipartizioneForm({ palazzina, unita, onSave, onClose }) {
  const [step, setStep] = useState(1);
  const [bolletta, setBolletta] = useState({
    fornitore: "",
    tipo: "luce",
    importoTotale: "",
    periodo: "",
    dataScadenza: "",
    consumo: "",
    unitaMisura: "kWh",
    note: "",
    fileName: "",
  });
  const [letture, setLetture] = useState(() =>
    Object.fromEntries(
      unita.map((u) => [u.id, { precedente: "", attuale: "" }]),
    ),
  );
  const [metodo, setMetodo] = useState("proporzionale");

  const setBoll = (k, v) => setBolletta((p) => ({ ...p, [k]: v }));
  const setLettura = (id, k, v) =>
    setLetture((p) => ({ ...p, [id]: { ...p[id], [k]: v } }));

  const importo = Number(bolletta.importoTotale) || 0;

  const consumi = unita.map((u) => {
    const l = letture[u.id] || {};
    return {
      ...u,
      consumo: Math.max(0, Number(l.attuale || 0) - Number(l.precedente || 0)),
    };
  });
  const totaleConsumi = consumi.reduce((a, u) => a + u.consumo, 0);

  const quote = consumi.map((u) => ({
    ...u,
    quota:
      Math.round(
        (metodo === "uguale"
          ? unita.length > 0
            ? importo / unita.length
            : 0
          : totaleConsumi > 0
            ? (u.consumo / totaleConsumi) * importo
            : 0) * 100,
      ) / 100,
  }));

  const catInfo =
    CATEGORIE_SPESA.find((c) => c.value === bolletta.tipo) ||
    CATEGORIE_SPESA[0];

  /* ── step label ── */
  const Stepper = () => (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
      {[
        { n: 1, l: "Bolletta" },
        { n: 2, l: "Contatori" },
        { n: 3, l: "Riepilogo" },
      ].map(({ n, l }, i) => (
        <div
          key={n}
          style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : 0 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
                background:
                  step >= n ? "var(--c-accent)" : "var(--c-surface-alt)",
                color: step >= n ? "#fff" : "var(--c-text-muted)",
              }}
            >
              {n}
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: step === n ? 600 : 400,
                color: step === n ? "var(--c-text)" : "var(--c-text-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {l}
            </span>
          </div>
          {i < 2 && (
            <div
              style={{
                flex: 1,
                height: 1,
                background: "var(--c-border)",
                margin: "0 10px",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );

  /* ── Step 1 ── */
  if (step === 1)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Stepper />
        <BollettaUploader
          onDatiEstratti={(d) => setBolletta((p) => ({ ...p, ...d }))}
        />
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <Field label="Fornitore">
            <Input
              value={bolletta.fornitore}
              onChange={(e) => setBoll("fornitore", e.target.value)}
              placeholder="es. Enel, A2A..."
            />
          </Field>
          <Field label="Tipo utenza">
            <Select
              value={bolletta.tipo}
              onChange={(e) => setBoll("tipo", e.target.value)}
            >
              {["luce", "gas", "acqua", "altro"].map((v) => {
                const c = CATEGORIE_SPESA.find((x) => x.value === v);
                return (
                  <option key={v} value={v}>
                    {c?.emoji} {c?.label}
                  </option>
                );
              })}
            </Select>
          </Field>
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <Field label="Importo totale (€)">
            <Input
              type="number"
              step="0.01"
              value={bolletta.importoTotale}
              onChange={(e) => setBoll("importoTotale", e.target.value)}
              placeholder="0.00"
            />
          </Field>
          <Field label="Periodo di riferimento">
            <Input
              value={bolletta.periodo}
              onChange={(e) => setBoll("periodo", e.target.value)}
              placeholder="es. marzo-aprile 2025"
            />
          </Field>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}
        >
          <Field label="Scadenza">
            <Input
              type="date"
              value={bolletta.dataScadenza}
              onChange={(e) => setBoll("dataScadenza", e.target.value)}
            />
          </Field>
          <Field label="Consumo totale">
            <Input
              type="number"
              step="0.01"
              value={bolletta.consumo}
              onChange={(e) => setBoll("consumo", e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="U.M.">
            <Select
              value={bolletta.unitaMisura}
              onChange={(e) => setBoll("unitaMisura", e.target.value)}
            >
              {["kWh", "mc", "l", "altro"].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Note">
          <Textarea
            value={bolletta.note}
            onChange={(e) => setBoll("note", e.target.value)}
            rows={2}
          />
        </Field>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            paddingTop: 4,
          }}
        >
          <Btn variant="ghost" onClick={onClose}>
            Annulla
          </Btn>
          <Btn onClick={() => setStep(2)} disabled={!bolletta.importoTotale}>
            Avanti →
          </Btn>
        </div>
      </div>
    );

  /* ── Step 2 ── */
  if (step === 2)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Stepper />

        {/* Metodo */}
        <div style={{ display: "flex", gap: 8 }}>
          {[
            {
              v: "proporzionale",
              icon: "📊",
              label: "Proporzionale ai consumi",
              desc: "Ogni unità paga in base ai propri kWh / mc letti sul contatore",
            },
            {
              v: "uguale",
              icon: "⚖️",
              label: "Quote uguali",
              desc: "Il costo viene diviso in parti uguali tra tutte le unità",
            },
          ].map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setMetodo(opt.v)}
              style={{
                flex: 1,
                padding: "12px 14px",
                borderRadius: 12,
                cursor: "pointer",
                textAlign: "left",
                border: `2px solid ${metodo === opt.v ? "var(--c-accent)" : "var(--c-border)"}`,
                background:
                  metodo === opt.v
                    ? "var(--c-accent-soft)"
                    : "var(--c-surface-alt)",
                fontFamily: "inherit",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  color: metodo === opt.v ? "var(--c-accent)" : "var(--c-text)",
                  marginBottom: 4,
                }}
              >
                {opt.icon} {opt.label}
              </div>
              <div style={{ fontSize: 11, color: "var(--c-text-muted)" }}>
                {opt.desc}
              </div>
            </button>
          ))}
        </div>

        {/* Tabella letture */}
        <div
          style={{
            border: "1px solid var(--c-border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                metodo === "proporzionale"
                  ? "1fr 110px 110px 90px"
                  : "1fr 100px",
              padding: "9px 14px",
              background: "var(--c-surface-alt)",
              borderBottom: "1px solid var(--c-border)",
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--c-text-muted)",
            }}
          >
            <span>Unità</span>
            {metodo === "proporzionale" && (
              <>
                <span style={{ textAlign: "right" }}>Lettura prec.</span>
                <span style={{ textAlign: "right" }}>Lettura att.</span>
                <span style={{ textAlign: "right" }}>Consumo</span>
              </>
            )}
            {metodo === "uguale" && (
              <span style={{ textAlign: "right" }}>Quota</span>
            )}
          </div>

          {unita.map((u, i) => {
            const l = letture[u.id] || {};
            const consumo = Math.max(
              0,
              Number(l.attuale || 0) - Number(l.precedente || 0),
            );
            return (
              <div
                key={u.id}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    metodo === "proporzionale"
                      ? "1fr 110px 110px 90px"
                      : "1fr 100px",
                  padding: "10px 14px",
                  alignItems: "center",
                  borderBottom:
                    i < unita.length - 1 ? "1px solid var(--c-border)" : "none",
                  background: i % 2 === 0 ? "var(--c-surface)" : "var(--c-bg)",
                  gap: 6,
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{u.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--c-text-muted)" }}>
                    {u.tipo}
                    {u.piano ? ` · piano ${u.piano}` : ""}
                  </div>
                </div>
                {metodo === "proporzionale" && (
                  <>
                    <Input
                      type="number"
                      step="0.01"
                      value={l.precedente}
                      onChange={(e) =>
                        setLettura(u.id, "precedente", e.target.value)
                      }
                      placeholder="Prec."
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={l.attuale}
                      onChange={(e) =>
                        setLettura(u.id, "attuale", e.target.value)
                      }
                      placeholder="Att."
                    />
                    <div
                      style={{
                        textAlign: "right",
                        fontWeight: 700,
                        fontSize: 14,
                        color:
                          consumo > 0 ? "var(--c-text)" : "var(--c-text-muted)",
                      }}
                    >
                      {consumo > 0
                        ? `${consumo.toFixed(2)} ${bolletta.unitaMisura}`
                        : "—"}
                    </div>
                  </>
                )}
                {metodo === "uguale" && (
                  <div
                    style={{
                      textAlign: "right",
                      fontWeight: 700,
                      fontSize: 14,
                      color: "var(--c-green)",
                    }}
                  >
                    {formatEuro(importo / unita.length)}
                  </div>
                )}
              </div>
            );
          })}

          {/* Footer totale consumi */}
          {metodo === "proporzionale" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 110px 110px 90px",
                padding: "9px 14px",
                background: "var(--c-surface-alt)",
                borderTop: "1px solid var(--c-border)",
                fontWeight: 700,
                fontSize: 12,
                gap: 6,
              }}
            >
              <span style={{ color: "var(--c-text-muted)" }}>
                Totale consumi
              </span>
              <span />
              <span />
              <span style={{ textAlign: "right" }}>
                {totaleConsumi > 0
                  ? `${totaleConsumi.toFixed(2)} ${bolletta.unitaMisura}`
                  : "—"}
              </span>
            </div>
          )}
        </div>

        {metodo === "proporzionale" && totaleConsumi === 0 && (
          <div
            style={{
              fontSize: 12,
              color: "var(--c-text-muted)",
              textAlign: "center",
            }}
          >
            Inserisci lettura precedente e attuale per ogni unità
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            paddingTop: 4,
          }}
        >
          <Btn variant="ghost" onClick={() => setStep(1)}>
            ← Indietro
          </Btn>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={onClose}>
              Annulla
            </Btn>
            <Btn
              onClick={() => setStep(3)}
              disabled={metodo === "proporzionale" && totaleConsumi === 0}
            >
              Avanti →
            </Btn>
          </div>
        </div>
      </div>
    );

  /* ── Step 3: Riepilogo ── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Stepper />

      {/* Intestazione bolletta */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          background: "var(--c-surface-alt)",
          borderRadius: 12,
          border: "1px solid var(--c-border)",
        }}
      >
        <div style={{ fontSize: 28 }}>{catInfo.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            {bolletta.fornitore || "Bolletta"} — {catInfo.label}
          </div>
          <div
            style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 2 }}
          >
            {bolletta.periodo && `${bolletta.periodo} · `}
            {palazzina.nome}
            {bolletta.dataScadenza &&
              ` · Scade: ${formatDate(bolletta.dataScadenza)}`}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            className="serif"
            style={{ fontSize: 26, color: "var(--c-accent)" }}
          >
            {formatEuro(importo)}
          </div>
          {bolletta.consumo > 0 && (
            <div style={{ fontSize: 11, color: "var(--c-text-muted)" }}>
              {bolletta.consumo} {bolletta.unitaMisura} totali
            </div>
          )}
        </div>
      </div>

      {/* Tabella quote */}
      <div
        style={{
          border: "1px solid var(--c-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 90px 70px 110px",
            padding: "9px 14px",
            background: "var(--c-surface-alt)",
            borderBottom: "1px solid var(--c-border)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--c-text-muted)",
          }}
        >
          <span>Unità</span>
          <span style={{ textAlign: "right" }}>Consumo</span>
          <span style={{ textAlign: "right" }}>%</span>
          <span style={{ textAlign: "right" }}>Da pagare</span>
        </div>
        {quote.map((q, i) => {
          const perc =
            metodo === "uguale"
              ? 100 / unita.length
              : totaleConsumi > 0
                ? (q.consumo / totaleConsumi) * 100
                : 0;
          return (
            <div
              key={q.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 90px 70px 110px",
                padding: "12px 14px",
                alignItems: "center",
                borderBottom:
                  i < quote.length - 1 ? "1px solid var(--c-border)" : "none",
                background: i % 2 === 0 ? "var(--c-surface)" : "var(--c-bg)",
              }}
            >
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{q.nome}</div>
                <div style={{ fontSize: 11, color: "var(--c-text-muted)" }}>
                  {q.tipo}
                  {q.piano ? ` · piano ${q.piano}` : ""}
                </div>
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontSize: 12,
                  color: "var(--c-text-muted)",
                }}
              >
                {metodo === "proporzionale" && q.consumo > 0
                  ? `${q.consumo.toFixed(2)} ${bolletta.unitaMisura}`
                  : "—"}
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--c-text-muted)",
                    marginBottom: 4,
                  }}
                >
                  {perc.toFixed(1)}%
                </div>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: "var(--c-border)",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 2,
                      background: "var(--c-accent)",
                      width: `${Math.min(100, perc)}%`,
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontWeight: 700,
                  fontSize: 16,
                  color: "var(--c-green)",
                }}
              >
                {formatEuro(q.quota)}
              </div>
            </div>
          );
        })}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 90px 70px 110px",
            padding: "10px 14px",
            background: "var(--c-surface-alt)",
            borderTop: "1px solid var(--c-border)",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <span style={{ color: "var(--c-text-muted)" }}>Totale</span>
          <span />
          <span />
          <span style={{ textAlign: "right", color: "var(--c-accent)" }}>
            {formatEuro(importo)}
          </span>
        </div>
      </div>

      <div
        style={{
          fontSize: 12,
          color: "var(--c-text-muted)",
          textAlign: "center",
        }}
      >
        Metodo:{" "}
        {metodo === "proporzionale"
          ? "Proporzionale ai consumi"
          : "Quote uguali"}{" "}
        · {unita.length} unità
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          paddingTop: 4,
        }}
      >
        <Btn variant="ghost" onClick={() => setStep(2)}>
          ← Indietro
        </Btn>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" onClick={onClose}>
            Annulla
          </Btn>
          <Btn
            variant="green"
            onClick={() =>
              onSave({
                palazzinaId: palazzina.id,
                bolletta,
                metodo,
                quote: quote.map((q) => ({
                  immobileId: q.id,
                  nome: q.nome,
                  consumo: q.consumo,
                  quota: q.quota,
                })),
                data: new Date().toISOString().slice(0, 10),
                totaleConsumi,
              })
            }
          >
            ✓ Salva ripartizione
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ── Card ripartizione salvata ── */
function RipartizioneCard({ rip, immobili, onDelete }) {
  const [open, setOpen] = useState(false);
  const palazzina = immobili.find((i) => i.id === rip.palazzinaId);
  const catInfo =
    CATEGORIE_SPESA.find((c) => c.value === rip.bolletta?.tipo) ||
    CATEGORIE_SPESA[0];
  const importo = Number(rip.bolletta?.importoTotale || 0);
  const scaduta =
    rip.bolletta?.dataScadenza &&
    new Date(rip.bolletta.dataScadenza) < new Date();

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            flexShrink: 0,
            background: "var(--c-accent-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          {catInfo.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {rip.bolletta?.fornitore || "Bolletta"} — {catInfo.label}
          </div>
          <div
            style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 2 }}
          >
            {palazzina?.nome || "—"}
            {rip.bolletta?.periodo ? ` · ${rip.bolletta.periodo}` : ""} ·{" "}
            {formatDate(rip.data)}
          </div>
          {rip.bolletta?.dataScadenza && (
            <div
              style={{
                fontSize: 11,
                marginTop: 2,
                color: scaduta ? "#dc2626" : "var(--c-text-muted)",
              }}
            >
              {scaduta ? "⚠ Scaduta il " : "⏰ Scade il "}
              {formatDate(rip.bolletta.dataScadenza)}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            className="serif"
            style={{ fontSize: 22, color: "var(--c-accent)" }}
          >
            {formatEuro(importo)}
          </div>
          <div style={{ fontSize: 11, color: "var(--c-text-muted)" }}>
            {(rip.quote || []).length} unità
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <Btn
            variant="ghost"
            className="text-xs px-2"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <ChevronUp /> : <ChevronDown />}
          </Btn>
          <Btn variant="danger" className="text-xs px-2" onClick={onDelete}>
            <Trash2 />
          </Btn>
        </div>
      </div>

      {/* Quote espanse */}
      {open && (rip.quote || []).length > 0 && (
        <div
          style={{
            marginTop: 14,
            borderTop: "1px solid var(--c-border)",
            paddingTop: 14,
          }}
        >
          {/* Header colonne */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 100px 110px",
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--c-text-muted)",
              marginBottom: 6,
              padding: "0 2px",
            }}
          >
            <span>Unità</span>
            <span style={{ textAlign: "right" }}>
              {rip.metodo === "proporzionale"
                ? `Consumo ${rip.bolletta?.unitaMisura || ""}`
                : "Quota %"}
            </span>
            <span style={{ textAlign: "right" }}>Da pagare</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {rip.quote.map((q, i) => {
              const perc =
                rip.metodo === "uguale"
                  ? 100 / rip.quote.length
                  : rip.totaleConsumi > 0
                    ? (q.consumo / rip.totaleConsumi) * 100
                    : 0;
              return (
                <div
                  key={q.immobileId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 100px 110px",
                    padding: "9px 2px",
                    borderTop: i > 0 ? "1px solid var(--c-border)" : "none",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 500, fontSize: 13 }}>
                    {q.nome}
                  </span>
                  <span
                    style={{
                      textAlign: "right",
                      fontSize: 12,
                      color: "var(--c-text-muted)",
                    }}
                  >
                    {rip.metodo === "proporzionale" && q.consumo > 0
                      ? `${Number(q.consumo).toFixed(2)}`
                      : `${perc.toFixed(1)}%`}
                  </span>
                  <span
                    style={{
                      textAlign: "right",
                      fontWeight: 700,
                      fontSize: 15,
                      color: "var(--c-green)",
                    }}
                  >
                    {formatEuro(q.quota)}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Barre proporzionali */}
          {rip.metodo === "proporzionale" && rip.totaleConsumi > 0 && (
            <div
              style={{
                marginTop: 12,
                padding: "12px 14px",
                background: "var(--c-surface-alt)",
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--c-text-muted)",
                  marginBottom: 8,
                }}
              >
                Distribuzione consumi
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {rip.quote.map((q) => {
                  const perc =
                    rip.totaleConsumi > 0
                      ? (q.consumo / rip.totaleConsumi) * 100
                      : 0;
                  return (
                    <div key={q.immobileId}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 11,
                          marginBottom: 3,
                        }}
                      >
                        <span style={{ color: "var(--c-text-muted)" }}>
                          {q.nome}
                        </span>
                        <span style={{ fontWeight: 600 }}>
                          {perc.toFixed(1)}%
                        </span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          borderRadius: 3,
                          background: "var(--c-border)",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 3,
                            background: "var(--c-accent)",
                            width: `${Math.min(100, perc)}%`,
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ── Main ── */
export default function Ripartizione({ data, addItem, removeItem }) {
  const [modal, setModal] = useState(null);
  const { ask, ConfirmModal } = useConfirm();

  const immobili = data.immobili || [];
  const ripartizioni = data.ripartizioni || [];
  const palazzine = immobili.filter((i) => i._tipo === "palazzina");
  const [filtroPal, setFiltroPal] = useState("tutte");

  const uniteDi = (palazzinaId) =>
    immobili.filter(
      (i) => i._tipo !== "palazzina" && i.palazzinaId === palazzinaId,
    );
  const palazzinaSelezionata = modal?.palazzinaId
    ? immobili.find((i) => i.id === modal.palazzinaId)
    : null;

  const filtered = [...ripartizioni]
    .filter((r) => filtroPal === "tutte" || r.palazzinaId === filtroPal)
    .sort((a, b) => (b.data || "").localeCompare(a.data || ""));

  const totaleRip = ripartizioni.reduce(
    (a, r) => a + Number(r.bolletta?.importoTotale || 0),
    0,
  );
  const scadute = ripartizioni.filter(
    (r) =>
      r.bolletta?.dataScadenza &&
      new Date(r.bolletta.dataScadenza) < new Date(),
  ).length;
  const palConUnita = palazzine.filter((p) => uniteDi(p.id).length > 0);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 className="serif" style={{ fontSize: 32 }}>
            Ripartizione bollette
          </h1>
          <p
            style={{ fontSize: 13, color: "var(--c-text-muted)", marginTop: 4 }}
          >
            Suddivisione costi per lettura contatori
          </p>
        </div>
        {palConUnita.length === 1 && (
          <Btn onClick={() => setModal({ palazzinaId: palConUnita[0].id })}>
            ＋ Nuova ripartizione
          </Btn>
        )}
        {palConUnita.length > 1 && (
          <Select
            value=""
            onChange={(e) =>
              e.target.value && setModal({ palazzinaId: e.target.value })
            }
            style={{ width: "auto" }}
          >
            <option value="">＋ Nuova ripartizione...</option>
            {palConUnita.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
        )}
      </div>

      {/* KPI */}
      {ripartizioni.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <StatCard
            label="Totale bollette"
            value={formatEuro(totaleRip)}
            color="var(--c-accent)"
          />
          <StatCard
            label="Ripartizioni"
            value={ripartizioni.length}
            sub="registrate"
          />
          <StatCard
            label="Scadute"
            value={scadute}
            sub="da pagare"
            color={scadute > 0 ? "#dc2626" : undefined}
          />
        </div>
      )}

      {/* Guardrail: nessuna palazzina */}
      {palazzine.length === 0 && (
        <EmptyState
          icon="🏢"
          title="Nessuna palazzina"
          description="La ripartizione bollette si applica alle palazzine con più unità. Vai in Immobili e aggiungi una palazzina."
        />
      )}

      {/* Guardrail: palazzine senza unità */}
      {palazzine.length > 0 && palConUnita.length === 0 && (
        <EmptyState
          icon="🏠"
          title="Nessuna unità nelle palazzine"
          description="Aggiungi appartamenti alle palazzine dalla sezione Immobili per poter ripartire i costi."
        />
      )}

      {palConUnita.length > 0 && (
        <>
          {palazzine.length > 1 && (
            <div
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              {[{ id: "tutte", nome: "Tutte" }, ...palazzine].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setFiltroPal(p.id)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    border: "1px solid var(--c-border)",
                    fontFamily: "inherit",
                    background:
                      filtroPal === p.id ? "var(--c-text)" : "var(--c-surface)",
                    color:
                      filtroPal === p.id
                        ? "var(--c-bg)"
                        : "var(--c-text-muted)",
                  }}
                >
                  {p.nome}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon="📄"
              title="Nessuna ripartizione"
              description="Carica la prima bolletta condominiale per suddividere i costi automaticamente tra gli appartamenti."
              action={
                palConUnita.length === 1 ? (
                  <Btn
                    onClick={() => setModal({ palazzinaId: palConUnita[0].id })}
                  >
                    ＋ Nuova ripartizione
                  </Btn>
                ) : null
              }
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filtered.map((r) => (
                <RipartizioneCard
                  key={r.id}
                  rip={r}
                  immobili={immobili}
                  onDelete={() =>
                    ask(
                      () => removeItem("ripartizioni", r.id),
                      "Eliminare questa ripartizione?",
                    )
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {modal?.palazzinaId && palazzinaSelezionata && (
        <Modal
          title={`Ripartizione — ${palazzinaSelezionata.nome}`}
          onClose={() => setModal(null)}
          wide
        >
          <RipartizioneForm
            palazzina={palazzinaSelezionata}
            unita={uniteDi(palazzinaSelezionata.id)}
            onSave={(f) => {
              addItem("ripartizioni", f);
              setModal(null);
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {ConfirmModal}
    </div>
  );
}
