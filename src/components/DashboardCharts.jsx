"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const eur = (n) =>
  new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

const compatto = (n) =>
  new Intl.NumberFormat("it-IT", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

const fmt = (v) => (v == null ? "-" : eur(v));

const eurD = (v) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("it-IT", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
      }).format(v);

const VERDE = "#16a34a";
const ROSSO = "#ef4444";
const INDACO = "#4f46e5";
const asse = { tickLine: false, axisLine: false, fontSize: 12 };

function Box({ titolo, sotto, children }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold">{titolo}</h2>
      {sotto && <p className="mt-3 text-xs text-gray-500">{sotto}</p>}
      <div className={sotto ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

export function Mensile({ dati, anno }) {
  return (
    <Box
      titolo={`Entrate e uscite per mese · ${anno}`}
      sotto="La linea mostra il risultato del mese: sotto lo zero il mese è in perdita."
    >
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart
          data={dati}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="mese" {...asse} />
          <YAxis tickFormatter={compatto} width={48} {...asse} />
          <Tooltip formatter={fmt} />
          <Legend />
          <ReferenceLine y={0} stroke="#9ca3af" />
          <Bar
            dataKey="entrate"
            name="Entrate"
            fill={VERDE}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="uscite"
            name="Uscite"
            fill={ROSSO}
            radius={[4, 4, 0, 0]}
          />
          <Line
            dataKey="risultato"
            name="Risultato"
            stroke={INDACO}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
}
export function Confronto({ righe, anni }) {
  const colori = [INDACO, "#f59e0b", "#94a3b8"];
  return (
    <Box
      titolo="Risultato cumulato: confronto con gli anni precedenti"
      sotto="Come si accumula l'utile (o la perdita) durante l'anno."
    >
      <ResponsiveContainer width="100%" height={250}>
        <LineChart
          data={righe}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="mese" {...asse} />
          <YAxis tickFormatter={compatto} width={48} {...asse} />
          <Tooltip formatter={fmt} />
          <Legend />
          <ReferenceLine y={0} stroke="#9ca3af" />
          {anni.map((a, i) => (
            <Line
              key={a}
              dataKey={String(a)}
              name={String(a)}
              stroke={colori[i] ?? "#cbd5e1"}
              strokeWidth={i === 0 ? 3 : 2}
              strokeDasharray={i === 0 ? undefined : "5 4"}
              dot={i === 0}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
export function Annuale({ dati }) {
  return (
    <Box
      titolo="Totali per anno"
      sotto="Il risultato è verde se l'anno chiude in utile, rosso se in perdita."
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={dati} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="anno" {...asse} />
          <YAxis tickFormatter={compatto} width={48} {...asse} />
          <Tooltip formatter={fmt} />
          <Legend />
          <ReferenceLine y={0} stroke="#9ca3af" />
          <Bar
            dataKey="entrate"
            name="Entrate"
            fill="#86efac"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="uscite"
            name="Uscite"
            fill="#fca5a5"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="risultato"
            name="Risultato"
            fill={INDACO}
            radius={[4, 4, 0, 0]}
          >
            {dati.map((d) => (
              <Cell
                key={d.anno}
                fill={d.risultato >= 0 ? "#15803d" : "#b91c1c"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
export function Categorie({ dati, anno }) {
  return (
    <Box
      titolo="Uscite per categoria"
      sotto={`${anno} a confronto con ${anno - 1} (stesso periodo)`}
    >
      {dati.length === 0 ? (
        <p className="text-sm text-gray-500">Nessuna uscita registrata</p>
      ) : (
        <ResponsiveContainer
          width="100%"
          height={Math.max(200, dati.length * 56)}
        >
          <BarChart
            data={dati}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={compatto} {...asse} />
            <YAxis type="category" dataKey="cat" {...asse} />
            <Tooltip formatter={fmt} />
            <Legend />
            <Bar
              dataKey="attuale"
              name={String(anno)}
              fill={INDACO}
              radius={[0, 4, 4, 0]}
            />
            <Bar
              dataKey="precedente"
              name={String(anno - 1)}
              fill="#cbd5e1"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
}

export function Giornaliero({ dati }) {
  return (
    <Box
      titolo="Incasso e costo al giorno per unità"
      sotto="Costo = spese di gestione, cedolare maturata e interessi; la quota capitale delle rate e i lavori straordinari sono esclusi"
    >
      <ResponsiveContainer
        width="100%"
        height={Math.max(220, dati.length * 62)}
      >
        <BarChart
          data={dati}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => `${v} €`} {...asse} />
          <YAxis type="category" dataKey="nome" width={150} {...asse} />
          <Tooltip formatter={eurD} />
          <Legend />
          <Bar
            dataKey="incasso"
            name="Incasso al giorno"
            fill={VERDE}
            radius={[0, 4, 4, 0]}
          />
          <Bar
            dataKey="costo"
            name="Costo al giorno"
            fill={ROSSO}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

export function InvestimentiBar({ dati }) {
  return (
    <Box
      titolo="Investimenti: capitale, risultato e valore"
      sotto="Quanto hai investito, quanto ha reso la gestione e quanto vale (o varrà a vendita conclusa)."
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={dati} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="nome" {...asse} />
          <YAxis tickFormatter={compatto} width={52} {...asse} />
          <Tooltip formatter={fmt} />
          <Legend />
          <ReferenceLine y={0} stroke="#9ca3af" />
          <Bar
            dataKey="capitale"
            name="Capitale investito"
            fill="#c7d2fe"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="operativo"
            name="Risultato operativo cumulato"
            fill={VERDE}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="valore"
            name="Valore attuale / atteso"
            fill={INDACO}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

export function DebitoChart({ dati }) {
  return (
    <Box
      titolo="Debito residuo dei finanziamenti"
      sotto="Effettivo fino a oggi, poi previsto secondo il piano di ammortamento."
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={dati}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            interval="preserveStartEnd"
            minTickGap={40}
            {...asse}
          />
          <YAxis tickFormatter={compatto} width={52} {...asse} />
          <Tooltip formatter={fmt} />
          <Legend />
          <Line
            dataKey="effettivo"
            name="Effettivo"
            stroke={INDACO}
            strokeWidth={3}
            dot={false}
            connectNulls={false}
          />
          <Line
            dataKey="previsto"
            name="Previsto"
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

export function Occupazione({ dati, anno }) {
  return (
    <Box titolo={`Affitti brevi: incassi e occupazione · ${anno}`} sotto="Barre: bonifici ricevuti nel mese. Linea: notti prenotate sui giorni di possesso.">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={dati} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="mese" {...asse} />
          <YAxis yAxisId="a" tickFormatter={compatto} width={48} {...asse} />
          <YAxis yAxisId="b" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={44} {...asse} />
          <Tooltip formatter={(v, nome) => (nome === "Occupazione" ? (v == null ? "—" : `${v}%`) : fmt(v))} />
          <Legend />
          <Bar yAxisId="a" dataKey="incasso" name="Incassi" fill={VERDE} radius={[4, 4, 0, 0]} />
          <Line yAxisId="b" dataKey="occupazione" name="Occupazione" stroke={INDACO} strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
}
