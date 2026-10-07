import { prisma } from "@/lib/prisma";
import { statoScadenza, addMonths } from "@/lib/scadenze";
import { CANALI } from "@/lib/canali";
import { CATEGORIE } from "@/lib/spese";
import { FREQ, occorrenzeFuture, sincronizzaRicorrenti } from "@/lib/ricorrenti";
import { imuStimata } from "@/lib/imu";
import { eur } from "@/lib/format";
import { pianoCedolare } from "./cedolare";

const g = (d) => d.toISOString().slice(0, 10);
const piu = (d, n) => new Date(d.getTime() + n * 86400000);

export const TIPI_EVENTO = {
  prenotazione: ["Prenotazione", "bg-indigo-100 text-indigo-800"],
  occupato: ["Occupato", "bg-gray-200 text-gray-700"],
  disdetta: ["Termine disdetta", "bg-red-100 text-red-800"],
  promemoria: ["Promemoria disdetta", "bg-amber-100 text-amber-800"],
  scadenza: ["Scadenza contratto", "bg-orange-100 text-orange-800"],
  imu: ["IMU", "bg-sky-100 text-sky-800"],
  rata: ["Rata mutuo / prestito", "bg-violet-100 text-violet-800"],
  pagamento: ["Pagamento ricorrente", "bg-teal-100 text-teal-800"],
  cedolare: ["Cedolare secca", "bg-emerald-100 text-emerald-800"],
  transitorio: ["Affitto transitorio", "bg-cyan-100 text-cyan-800"],
};

// fine = giorno successivo all'ultimo (come negli eventi "tutto il giorno" di Google)
export async function eventiCalendario() {
  await sincronizzaRicorrenti(); // genera le spese ricorrenti maturate fino a oggi

  const ora = new Date();
  const oggi = new Date();
  oggi.setUTCHours(0, 0, 0, 0);
  const eventi = [];
  const singolo = (e, data) => eventi.push({ ...e, inizio: g(data), fine: g(piu(data, 1)) });

  // prenotazioni e occupazioni
  const pren = await prisma.prenotazione.findMany({ where: { stato: "CONFERMATA" }, include: { unita: true } });
  for (const p of pren) {
    eventi.push({
      id: `pren-${p.id}`,
      tipo: p.blocco ? "occupato" : "prenotazione",
      titolo: p.blocco ? `${p.unita.nome} — occupato` : `${p.unita.nome}${p.ospite ? ` — ${p.ospite}` : ""}`,
      descrizione: [CANALI[p.canale], p.note].filter(Boolean).join(" · "),
      inizio: g(p.checkIn),
      fine: g(p.checkOut),
      link: `/calendario/prenotazioni/${p.id}/modifica`,
    });
  }

  // scadenze dei contratti lunghi e promemoria di disdetta
  const contratti = await prisma.contratto.findMany({
    where: { tipo: "LUNGO", dataFine: { not: null } },
    include: { unita: true, inquilino: true },
  });
  for (const c of contratti) {
    const s = statoScadenza(c);
    if (!s || s.giorniAllaScadenza < 0 || s.livello === "concluso" || s.livello === "rinnovato") continue;
    if (c.modalia === "TRANSITORIO") continue; // ha il suo evento di periodo, senza disdetta
    const chi = `${c.unita.nome} (${c.inquilino.nome})`;
    const link = `/entrate/contratti/${c.id}`;

    singolo({ id: `scad-${c.id}`, tipo: "scadenza", titolo: `Scade il contratto — ${chi}`, descrizione: "Dettagli nella scheda contratto.", link }, s.scadenza);

    if (!c.disdettaInviataIl) {
      const desc = `Preavviso di ${c.preavvisoMesi} mesi. Il contratto scade il ${g(s.scadenza)}. La comunicazione deve arrivare entro il termine.`;
      const termini = [
        [`disd90-${c.id}`, -90, "promemoria", `Tra 90 giorni scade il termine per la disdetta — ${chi}`],
        [`disd30-${c.id}`, -30, "promemoria", `Tra 30 giorni scade il termine per la disdetta — ${chi}`],
        [`disd-${c.id}`, 0, "disdetta", `ULTIMO GIORNO per la disdetta — ${chi}`],
      ];
      for (const [id, off, tipo, titolo] of termini) {
        const d = piu(s.limite, off);
        if (d >= oggi) singolo({ id, tipo, titolo, descrizione: desc, link }, d);
      }
    }
  }

  // periodi dei contratti transitori (anche passati)
  const trans = await prisma.contratto.findMany({
    where: { modalita: "TRANSITORIO", dataFine: { not: null } },
    include: { unita: true, inquilino: true },
  });
  for (const c of trans)
    eventi.push({
      id: `trans-${c.id}`,
      tipo: "transitorio",
      titolo: `${c.unita.nome} — transitorio (${c.inquilino.nome})`,
      descrizione: "Contratto transitorio: le date sono occupate. Verifica che il calendario dell'agenzia sia bloccato.",
      inizio: g(c.dataInizio),
      fine: g(piu(c.dataFine, 1)),
      link: `/entrate/contratti/${c.id}`,
    });

  // pagamenti ricorrenti (mutuo, prestiti, internet…): passati = spese già generate, futuri = calcolati
  const tipoDi = (cat) => (cat === "MUTUO" ? "rata" : "pagamento");

  const generate = await prisma.spesa.findMany({
    where: { ricorrenteId: { not: null } },
    include: { unita: true, palazzina: true },
  });
  for (const s of generate) {
    singolo({
      id: `rpag-${s.id}`,
      tipo: tipoDi(s.categoria),
      titolo: `${s.descrizione ?? CATEGORIE[s.categoria]} — ${eur(s.importo)}`,
      descrizione: [s.unita?.nome ?? (s.palazzina ? `${s.palazzina.nome} (palazzina)` : null), CATEGORIE[s.categoria], s.fornitore]
        .filter(Boolean).join(" · "),
      link: `/spese/${s.id}/modifica`,
    }, s.data);
  }

  const ricorrenti = await prisma.spesaRicorrente.findMany({ include: { unita: true, palazzina: true } });
  const orizzonte = addMonths(ora, 24);
  for (const r of ricorrenti) {
    for (const d of occorrenzeFuture(r, ora, orizzonte)) {
      singolo({
        id: `rfut-${r.id}-${g(d)}`,
        tipo: tipoDi(r.categoria),
        titolo: `${r.descrizione} — ${eur(r.importo)}`,
        descrizione: [r.unita?.nome ?? `${r.palazzina.nome} (palazzina)`, CATEGORIE[r.categoria], FREQ[r.frequenza][0].toLowerCase(), r.fornitore]
          .filter(Boolean).join(" · "),
        link: `/spese/ricorrenti/${r.id}/modifica`,
      }, d);
    }
  }

  // rate non ancora pagate delle dilazioni d'imposta
  const rateDil = await prisma.rataDilazione.findMany({
    where: { pagataIl: null },
    include: { dilazione: { include: { rate: { select: { id: true } } } } },
  });
  for (const r of rateDil)
    singolo({
      id: `rdil-${r.id}`,
      tipo: "rata",
      titolo: `Rata cedolare ${r.dilazione.anno} (${r.numero}/${r.dilazione.rate.length}) — ${eur(r.importo)}`,
      descrizione: `${r.dilazione.descrizione}. Dopo il pagamento segnala la rata come pagata nella scheda.`,
      link: `/spese/dilazioni/${r.dilazioneId}`,
    }, r.scadenza);

  // scadenze della cedolare secca (acconti e saldo) con importo stimato
  for (const a of [oggi.getUTCFullYear() - 1, oggi.getUTCFullYear()]) {
    const p = await pianoCedolare(a);
    if (p.residuo <= 0.005) continue; // già coperta da versamenti o da una dilazione
    for (const r of p.rate) {
      if (r.importo <= 0.005 || r.scadenza < oggi) continue;
      singolo({
        id: `ced-${a}-${r.id}`,
        tipo: "cedolare",
        titolo: `Cedolare secca ${a} — ${r.titolo} (≈ ${eur(r.importo)})`,
        descrizione: `F24, codice tributo ${r.codice}. Importo stimato col metodo storico: verifica la cifra con il commercialista prima di pagare.`,
        link: `/spese?anno=${a}`,
      }, r.scadenza);
    }
  }

  // scadenze IMU, con importo stimato
  const conCatasto = await prisma.unita.findMany({
    where: { dataVendita: null, catasto: { isNot: null } },
    include: { catasto: true },
  });
  if (conCatasto.length > 0) {
    const annua = conCatasto.reduce((t, u) => t + (imuStimata(u.catasto) ?? 0), 0);
    const y = oggi.getUTCFullYear();
    for (const anno of [y, y + 1]) {
      for (const [mese, quale] of [[5, "acconto"], [11, "saldo"]]) {
        const d = new Date(Date.UTC(anno, mese, 16));
        if (d >= oggi)
          singolo({
            id: `imu-${anno}-${quale}`,
            tipo: "imu",
            titolo: `Scadenza IMU — ${quale} ${anno}${annua > 0 ? ` (≈ ${eur(annua / 2)})` : ""}`,
            descrizione: "Importo indicativo: circa la metà della stima annua. Di norma, se il 16 cade di sabato o in un giorno festivo si paga il primo giorno lavorativo successivo. Stima e versamenti nella sezione Spese.",
            link: "/spese",
          }, d);
      }
    }
  }

  return eventi.sort((a, b) => (a.inizio < b.inizio ? -1 : a.inizio > b.inizio ? 1 : 0));
}