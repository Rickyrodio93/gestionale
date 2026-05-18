import { useState, useMemo, useRef } from "react";
import {
  Modal,
  Field,
  Input,
  Select,
  Textarea,
  Btn,
  Card,
  Badge,
  StatCard,
  EmptyState,
  useConfirm,
} from "./ui.jsx";
import { CATEGORIE_VOCE, UM_OPTIONS, formatEuro, formatDate } from "./store.js";
import { Paperclip } from "lucide-react";

const STATI = [
  { value: "pianificato", label: "Pianificato", color: "blue" },
  { value: "in_corso", label: "In corso", color: "yellow" },
  { value: "completato", label: "Completato", color: "green" },
  { value: "sospeso", label: "Sospeso", color: "default" },
];

/* ── Riga voce computo ── */
function VoceRow({ v, onChange, onRemove }) {
  const set = (k, val) => onChange({ ...v, [k]: val });
  const totale = Number(v.quantita || 0) * Number(v.prezzoUnitario || 0);
  return (
    <div
      style={{
        display: "grid",
        gap: 6,
        padding: "10px 12px",
        borderRadius: 10,
        background: "var(--c-surface-alt)",
        border: "1px solid var(--c-border)",
        gridTemplateColumns: "2fr 72px 80px 96px 100px 28px",
        alignItems: "center",
      }}
    >
      <Input
        value={v.descrizione}
        onChange={(e) => set("descrizione", e.target.value)}
        placeholder="Descrizione lavorazione..."
      />
      <Select value={v.um} onChange={(e) => set("um", e.target.value)}>
        {UM_OPTIONS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </Select>
      <Input
        type="number"
        step="0.01"
        value={v.quantita}
        onChange={(e) => set("quantita", e.target.value)}
        placeholder="Qtà"
      />
      <Input
        type="number"
        step="0.01"
        value={v.prezzoUnitario}
        onChange={(e) => set("prezzoUnitario", e.target.value)}
        placeholder="€/um"
      />
      <div
        style={{
          textAlign: "right",
          fontWeight: 700,
          fontSize: 13,
          color: "var(--c-text)",
          paddingRight: 4,
        }}
      >
        {formatEuro(totale)}
      </div>
      <button
        onClick={onRemove}
        type="button"
        style={{
          width: 26,
          height: 26,
          borderRadius: 6,
          border: "none",
          background: "var(--c-red-soft)",
          color: "#dc2626",
          cursor: "pointer",
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ✕
      </button>
    </div>
  );
}

/* ── Upload preventivo con parsing AI ── */
function PreventivoUploader({ onVociExtracted }) {
  const [stato, setStato] = useState("idle"); // idle | loading | done | error
  const [msg, setMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setStato("loading");
    setMsg("Analisi del preventivo in corso...");

    try {
      // Leggi file come base64
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.onerror = () => rej(new Error("Errore lettura file"));
        reader.readAsDataURL(file);
      });

      const isPDF = file.type === "application/pdf";
      const mediaType = isPDF ? "application/pdf" : file.type;

      const prompt = `Sei un assistente per la gestione di immobili. Analizza questo preventivo di lavori edili/ristrutturazione ed estrai tutte le voci di computo metrico.

Per ogni voce che trovi, restituisci un JSON array con oggetti in questo formato:
{
  "descrizione": "descrizione della lavorazione",
  "um": "unità di misura (usa solo: mq, ml, pz, ore, kg, lt, corpo)",
  "quantita": numero,
  "prezzoUnitario": numero,
  "categoria": "materiali" oppure "manodopera" oppure "trasporto" oppure "altro"
}

Se un campo non è presente nel preventivo, usa valori ragionevoli o 0.
Rispondi SOLO con il JSON array, senza testo aggiuntivo, senza markdown, senza backtick.`;

      const body = {
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: isPDF ? "document" : "image",
                source: { type: "base64", media_type: mediaType, data: base64 },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      };

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      const text = (data.content || []).map((c) => c.text || "").join("");

      // Pulisci e parsa JSON
      const clean = text.replace(/```json|```/g, "").trim();
      const voci = JSON.parse(clean);

      if (!Array.isArray(voci) || voci.length === 0)
        throw new Error("Nessuna voce trovata");

      setStato("done");
      setMsg(`✓ Estratte ${voci.length} voci dal preventivo`);
      onVociExtracted(
        voci.map((v) => ({
          id: Date.now().toString() + Math.random(),
          descrizione: String(v.descrizione || ""),
          um: UM_OPTIONS.includes(v.um) ? v.um : "pz",
          quantita: String(Number(v.quantita) || ""),
          prezzoUnitario: String(Number(v.prezzoUnitario) || ""),
          categoria: ["materiali", "manodopera", "trasporto", "altro"].includes(
            v.categoria,
          )
            ? v.categoria
            : "materiali",
        })),
      );
    } catch (err) {
      setStato("error");
      setMsg(
        `Errore: ${err.message}. Verifica che il file sia un PDF o immagine chiara.`,
      );
    }
  };

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
          border: `2px dashed ${stato === "done" ? "var(--c-green)" : stato === "error" ? "#dc2626" : "var(--c-border)"}`,
          borderRadius: 12,
          padding: "20px 16px",
          textAlign: "center",
          cursor: stato === "loading" ? "not-allowed" : "pointer",
          background:
            stato === "done"
              ? "var(--c-green-soft)"
              : stato === "error"
                ? "var(--c-red-soft)"
                : "var(--c-surface-alt)",
          transition: "all 0.15s",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <div style={{ fontSize: 24, marginBottom: 8 }}>
          {stato === "loading" ? (
            "⏳"
          ) : stato === "done" ? (
            "✅"
          ) : stato === "error" ? (
            "❌"
          ) : (
            <Paperclip />
          )}
        </div>
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: "var(--c-text)",
            marginBottom: 4,
          }}
        >
          {stato === "idle" ? "Carica preventivo PDF o immagine" : fileName}
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
            ? "Trascina qui o clicca per selezionare · PDF, JPG, PNG"
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
                borderRadius: 2,
                background: "var(--c-accent)",
                animation: "pulse 1.2s ease-in-out infinite",
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

/* ── Form lavoro ── */
function LavoroForm({ init = {}, immobili, onSave, onClose }) {
  const [form, setForm] = useState({
    immobileId: immobili[0]?.id || "",
    titolo: "",
    stato: "pianificato",
    dataInizio: "",
    dataFine: "",
    note: "",
    voci: [],
    ...init,
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const [showUpload, setShowUpload] = useState(false);

  const addVoce = () =>
    set("voci", [
      ...(form.voci || []),
      {
        id: Date.now().toString(),
        descrizione: "",
        um: "mq",
        quantita: "",
        prezzoUnitario: "",
        categoria: "materiali",
      },
    ]);

  const updateVoce = (idx, changes) => {
    const v = [...(form.voci || [])];
    v[idx] = { ...v[idx], ...changes };
    set("voci", v);
  };

  const removeVoce = (idx) =>
    set(
      "voci",
      form.voci.filter((_, i) => i !== idx),
    );

  const totale = (form.voci || []).reduce(
    (a, v) => a + Number(v.quantita || 0) * Number(v.prezzoUnitario || 0),
    0,
  );

  const totPerCat = (cat) =>
    (form.voci || [])
      .filter((v) => v.categoria === cat)
      .reduce(
        (a, v) => a + Number(v.quantita || 0) * Number(v.prezzoUnitario || 0),
        0,
      );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Immobile / Palazzina">
          <Select
            value={form.immobileId}
            onChange={(e) => set("immobileId", e.target.value)}
            required
          >
            {immobili.map((i) => (
              <option key={i.id} value={i.id}>
                {i._tipo === "palazzina" ? "🏢 " : "🏠 "}
                {i.nome || i.indirizzo}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Stato">
          <Select
            value={form.stato}
            onChange={(e) => set("stato", e.target.value)}
          >
            {STATI.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Titolo lavoro">
        <Input
          value={form.titolo}
          onChange={(e) => set("titolo", e.target.value)}
          placeholder="es. Rifacimento facciata, ristrutturazione bagno..."
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Data inizio">
          <Input
            type="date"
            value={form.dataInizio}
            onChange={(e) => set("dataInizio", e.target.value)}
          />
        </Field>
        <Field label="Data fine prevista">
          <Input
            type="date"
            value={form.dataFine}
            onChange={(e) => set("dataFine", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Note">
        <Textarea
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder="Impresa, contatti, condizioni, ecc."
        />
      </Field>

      {/* Computo metrico */}
      <div
        style={{
          border: "1px solid var(--c-border)",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {/* Header sezione */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: "var(--c-surface-alt)",
            borderBottom: "1px solid var(--c-border)",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13 }}>Computo metrico</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => setShowUpload((s) => !s)}
              style={{
                padding: "5px 12px",
                borderRadius: 8,
                border: "1px solid var(--c-border)",
                background: showUpload
                  ? "var(--c-accent-soft)"
                  : "var(--c-surface)",
                color: showUpload ? "var(--c-accent)" : "var(--c-text-muted)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 500,
              }}
              className="flex items-center justify-between"
            >
              <Paperclip /> Carica preventivo AI
            </button>
            <button
              type="button"
              onClick={addVoce}
              style={{
                padding: "5px 12px",
                borderRadius: 8,
                border: "1px solid var(--c-border)",
                background: "var(--c-surface)",
                color: "var(--c-text-muted)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 500,
              }}
            >
              ＋ Voce manuale
            </button>
          </div>
        </div>

        <div
          style={{
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Upload area */}
          {showUpload && (
            <PreventivoUploader
              onVociExtracted={(nuoveVoci) => {
                set("voci", [...(form.voci || []), ...nuoveVoci]);
                setShowUpload(false);
              }}
            />
          )}

          {/* Intestazione colonne */}
          {(form.voci || []).length > 0 && (
            <div
              style={{
                display: "grid",
                gap: 6,
                padding: "0 12px",
                gridTemplateColumns: "2fr 72px 80px 96px 100px 28px",
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--c-text-muted)",
              }}
            >
              <span>Descrizione</span>
              <span>U.M.</span>
              <span>Qtà</span>
              <span>€/U.M.</span>
              <span style={{ textAlign: "right" }}>Totale</span>
              <span />
            </div>
          )}

          {/* Raggruppa per categoria */}
          {["materiali", "manodopera", "trasporto", "altro"].map((cat) => {
            const vociCat = (form.voci || [])
              .map((v, i) => ({ v, i }))
              .filter(({ v }) => v.categoria === cat);
            if (vociCat.length === 0) return null;
            const subTot = vociCat.reduce(
              (a, { v }) =>
                a + Number(v.quantita || 0) * Number(v.prezzoUnitario || 0),
              0,
            );
            const catLabel = {
              materiali: "🧱 Materiali",
              manodopera: "👷 Manodopera",
              trasporto: "🚛 Trasporto",
              altro: "📌 Altro",
            }[cat];
            return (
              <div key={cat}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--c-text-muted)",
                    }}
                  >
                    {catLabel}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--c-text-muted)",
                    }}
                  >
                    {formatEuro(subTot)}
                  </div>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {vociCat.map(({ v, i }) => (
                    <VoceRow
                      key={v.id}
                      v={v}
                      onChange={(ch) => updateVoce(i, ch)}
                      onRemove={() => removeVoce(i)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {(form.voci || []).length === 0 && !showUpload && (
            <div
              style={{
                textAlign: "center",
                padding: "20px 0",
                fontSize: 13,
                color: "var(--c-text-muted)",
              }}
            >
              Carica un preventivo o aggiungi voci manualmente
            </div>
          )}

          {/* Totale */}
          {(form.voci || []).length > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                paddingTop: 8,
                borderTop: "1px solid var(--c-border)",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 13, color: "var(--c-text-muted)" }}>
                Totale preventivo
              </span>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  fontFamily: "DM Serif Display, serif",
                  color: "var(--c-text)",
                }}
              >
                {formatEuro(totale)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Btn type="button" variant="ghost" onClick={onClose}>
          Annulla
        </Btn>
        <Btn type="submit">Salva lavoro</Btn>
      </div>
    </form>
  );
}

/* ── Main ── */
export default function Lavori({ data, addItem, removeItem, updateItem }) {
  const [modal, setModal] = useState(null);
  const [filtroStato, setFiltroStato] = useState("tutti");
  const { ask, ConfirmModal } = useConfirm();

  const immobili = data.immobili || [];
  const lavori = data.lavori || [];

  // Tutti gli immobili selezionabili (palazzine + unità)
  const tuttiImmobili = immobili;

  const filtered = useMemo(
    () =>
      lavori
        .filter((l) => filtroStato === "tutti" || l.stato === filtroStato)
        .sort((a, b) => (b.dataInizio || "").localeCompare(a.dataInizio || "")),
    [lavori, filtroStato],
  );

  const nomeImm = (id) => {
    const i = immobili.find((x) => x.id === id);
    if (!i) return "—";
    return (
      (i._tipo === "palazzina" ? "🏢 " : "") + (i.nome || i.indirizzo || "—")
    );
  };

  const totaleLavoro = (l) =>
    (l.voci || []).reduce(
      (a, v) => a + Number(v.quantita || 0) * Number(v.prezzoUnitario || 0),
      0,
    );
  const totaleGlobale = lavori.reduce((a, l) => a + totaleLavoro(l), 0);
  const inCorso = lavori.filter((l) => l.stato === "in_corso").length;
  const pianificati = lavori.filter((l) => l.stato === "pianificato").length;

  const statoInfo = (v) => STATI.find((s) => s.value === v) || STATI[0];

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
            Lavori & Computi
          </h1>
          <p
            style={{ fontSize: 13, color: "var(--c-text-muted)", marginTop: 4 }}
          >
            Ristrutturazioni, computi metrici e preventivi
          </p>
        </div>
        <Btn onClick={() => setModal("new")}>＋ Nuovo lavoro</Btn>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Valore totale lavori"
          value={formatEuro(totaleGlobale)}
          color="var(--c-yellow)"
        />
        <StatCard label="In corso" value={inCorso} sub="cantieri attivi" />
        <StatCard label="Pianificati" value={pianificati} sub="da avviare" />
      </div>

      {/* Filtri stato */}
      <div
        style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}
      >
        {[{ value: "tutti", label: "Tutti" }, ...STATI].map((s) => (
          <button
            key={s.value}
            onClick={() => setFiltroStato(s.value)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              border: "1px solid var(--c-border)",
              fontFamily: "inherit",
              background:
                filtroStato === s.value ? "var(--c-text)" : "var(--c-surface)",
              color:
                filtroStato === s.value ? "var(--c-bg)" : "var(--c-text-muted)",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🔨"
          title="Nessun lavoro"
          description="Aggiungi ristrutturazioni e carica direttamente i preventivi delle imprese."
          action={<Btn onClick={() => setModal("new")}>＋ Aggiungi lavoro</Btn>}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((l) => {
            const stato = statoInfo(l.stato);
            const totale = totaleLavoro(l);
            const mat = (l.voci || [])
              .filter((v) => v.categoria === "materiali")
              .reduce(
                (a, v) =>
                  a + Number(v.quantita || 0) * Number(v.prezzoUnitario || 0),
                0,
              );
            const man = (l.voci || [])
              .filter((v) => v.categoria === "manodopera")
              .reduce(
                (a, v) =>
                  a + Number(v.quantita || 0) * Number(v.prezzoUnitario || 0),
                0,
              );
            return (
              <Card key={l.id}>
                <div
                  style={{ display: "flex", alignItems: "flex-start", gap: 14 }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: "var(--c-yellow-soft)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    🔨
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 15 }}>
                        {l.titolo}
                      </span>
                      <Badge color={stato.color}>{stato.label}</Badge>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--c-text-muted)",
                        marginTop: 3,
                      }}
                    >
                      {nomeImm(l.immobileId)}
                      {l.dataInizio && ` · ${formatDate(l.dataInizio)}`}
                      {l.dataFine && ` → ${formatDate(l.dataFine)}`}
                    </div>
                    {l.note && (
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--c-text-muted)",
                          marginTop: 4,
                        }}
                      >
                        {l.note}
                      </div>
                    )}

                    {/* Subtotali categoria */}
                    {(l.voci || []).length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          marginTop: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        {mat > 0 && (
                          <div
                            style={{
                              padding: "4px 10px",
                              borderRadius: 8,
                              background: "var(--c-blue-soft)",
                              color: "var(--c-blue)",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            🧱 {formatEuro(mat)}
                          </div>
                        )}
                        {man > 0 && (
                          <div
                            style={{
                              padding: "4px 10px",
                              borderRadius: 8,
                              background: "var(--c-yellow-soft)",
                              color: "var(--c-yellow)",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            👷 {formatEuro(man)}
                          </div>
                        )}
                        {totale - mat - man > 0.01 && (
                          <div
                            style={{
                              padding: "4px 10px",
                              borderRadius: 8,
                              background: "var(--c-surface-alt)",
                              color: "var(--c-text-muted)",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {formatEuro(totale - mat - man)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Voci collassabili */}
                    {(l.voci || []).length > 0 && (
                      <details style={{ marginTop: 10 }}>
                        <summary
                          style={{
                            fontSize: 12,
                            cursor: "pointer",
                            fontWeight: 500,
                            color: "var(--c-text-muted)",
                          }}
                        >
                          {l.voci.length} voci nel computo
                        </summary>
                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              fontSize: 10,
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              color: "var(--c-text-muted)",
                              padding: "2px 12px",
                              gridTemplateColumns: "2fr 60px 70px 80px 80px",
                            }}
                          >
                            <span>Descrizione</span>
                            <span>U.M.</span>
                            <span>Qtà</span>
                            <span>€/U.M.</span>
                            <span style={{ textAlign: "right" }}>Totale</span>
                          </div>
                          {l.voci.map((v) => (
                            <div
                              key={v.id}
                              style={{
                                display: "grid",
                                alignItems: "center",
                                fontSize: 12,
                                padding: "7px 12px",
                                borderRadius: 8,
                                background: "var(--c-surface-alt)",
                                gridTemplateColumns: "2fr 60px 70px 80px 80px",
                              }}
                            >
                              <span
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {v.descrizione}
                              </span>
                              <span style={{ color: "var(--c-text-muted)" }}>
                                {v.um}
                              </span>
                              <span>{v.quantita}</span>
                              <span>{formatEuro(v.prezzoUnitario)}</span>
                              <span
                                style={{ textAlign: "right", fontWeight: 700 }}
                              >
                                {formatEuro(
                                  Number(v.quantita || 0) *
                                    Number(v.prezzoUnitario || 0),
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      className="serif"
                      style={{ fontSize: 22, color: "var(--c-yellow)" }}
                    >
                      {formatEuro(totale)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--c-text-muted)" }}>
                      {(l.voci || []).length} voci
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <Btn
                      variant="ghost"
                      className="text-xs px-2"
                      onClick={() => setModal({ edit: l })}
                    >
                      ✏️
                    </Btn>
                    <Btn
                      variant="danger"
                      className="text-xs px-2"
                      onClick={() => ask(() => removeItem("lavori", l.id))}
                    >
                      🗑
                    </Btn>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {modal === "new" && (
        <Modal
          title="Nuovo lavoro / Computo metrico"
          onClose={() => setModal(null)}
          wide
        >
          <LavoroForm
            immobili={tuttiImmobili}
            onSave={(f) => {
              addItem("lavori", f);
              setModal(null);
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.edit && (
        <Modal title="Modifica lavoro" onClose={() => setModal(null)} wide>
          <LavoroForm
            init={modal.edit}
            immobili={tuttiImmobili}
            onSave={(f) => {
              updateItem("lavori", modal.edit.id, f);
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
