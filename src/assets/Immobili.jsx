import { useState } from 'react'
import { Modal, Field, Input, Select, Textarea, Btn, Card, Badge, EmptyState, useConfirm } from './ui.jsx'
import { formatEuro } from './store.js'
import { Pencil, Trash2 } from 'lucide-react'

const TIPI = ['appartamento', 'villa', 'box', 'locale commerciale', 'altro']

function ImmobileForm({ init = {}, onSave, onClose }) {
  const [form, setForm] = useState({
    nome: '', tipo: 'appartamento', mq: '', piano: '', note: '', ...init
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  return (
    <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); onSave(form) }}>
      <Field label="Indirizzo / Nome immobile">
        <Input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="es. Via Roma 12, Milano" required />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Tipo">
          <Select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
            {TIPI.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="MQ">
          <Input type="number" value={form.mq} onChange={e => set('mq', e.target.value)} placeholder="75" />
        </Field>
      </div>
      <Field label="Piano">
        <Input value={form.piano} onChange={e => set('piano', e.target.value)} placeholder="es. 2" />
      </Field>
      <Field label="Note">
        <Textarea value={form.note} onChange={e => set('note', e.target.value)} placeholder="Caratteristiche, inquilini, stato..." />
      </Field>
      <div className="flex gap-2 justify-end pt-2">
        <Btn type="button" variant="ghost" onClick={onClose}>Annulla</Btn>
        <Btn type="submit">Salva immobile</Btn>
      </div>
    </form>
  )
}

export default function Immobili({ data, addItem, removeItem, updateItem }) {
  const [modal, setModal] = useState(null) // null | 'new' | { edit: item }
  const { ask, ConfirmModal } = useConfirm()

  const immobili = data.immobili || []
  const spese = data.spese || []
  const rendite = data.rendite || []
  const lavori = data.lavori || []

  const totaleSpese = (id) => spese.filter(s => s.immobileId === id).reduce((a, s) => a + Number(s.importo), 0)
  const totaleRendite = (id) => {
    const r = rendite.filter(x => x.immobileId === id)
    return r.reduce((acc, x) => {
      if (x.tipo === 'lungo') return acc + Number(x.importo || 0)
      if (x.tipo === 'breve') return acc + (x.prenotazioni || []).reduce((a, p) => a + Number(p.totale || 0), 0)
      return acc
    }, 0)
  }
  const lavoriAttivi = (id) => lavori.filter(l => l.immobileId === id && l.stato !== 'completato').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="serif text-3xl">Immobili</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--c-text-muted)' }}>{immobili.length} proprietà nel portfolio</p>
        </div>
        <Btn onClick={() => setModal('new')}>＋ Aggiungi immobile</Btn>
      </div>

      {immobili.length === 0 ? (
        <EmptyState icon="🏠" title="Nessun immobile"
          description="Aggiungi il primo immobile per iniziare a gestire il portfolio."
          action={<Btn onClick={() => setModal('new')}>Aggiungi immobile</Btn>} />
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {immobili.map(imm => {
            const entrate = totaleRendite(imm.id)
            const uscite = totaleSpese(imm.id)
            const netto = entrate - uscite
            const wip = lavoriAttivi(imm.id)
            return (
              <Card key={imm.id} className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-600 text-base leading-tight">{imm.nome}</div>
                    <div className="text-sm mt-0.5" style={{ color: 'var(--c-text-muted)' }}>
                      {imm.tipo}{imm.mq ? ` · ${imm.mq} mq` : ''}{imm.piano ? ` · piano ${imm.piano}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {wip > 0 && <Badge color="yellow">🔨 {wip} lavori</Badge>}
                  </div>
                </div>

                {imm.note && (
                  <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>{imm.note}</p>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl p-3 text-center" style={{ background: 'var(--c-green-soft)' }}>
                    <div className="text-xs font-500 mb-1" style={{ color: 'var(--c-green)' }}>Rendite</div>
                    <div className="font-700 text-sm" style={{ color: 'var(--c-green)' }}>{formatEuro(entrate)}</div>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: 'var(--c-accent-soft)' }}>
                    <div className="text-xs font-500 mb-1" style={{ color: 'var(--c-accent)' }}>Spese</div>
                    <div className="font-700 text-sm" style={{ color: 'var(--c-accent)' }}>{formatEuro(uscite)}</div>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: netto >= 0 ? 'var(--c-green-soft)' : '#fee2e2' }}>
                    <div className="text-xs font-500 mb-1" style={{ color: netto >= 0 ? 'var(--c-green)' : '#dc2626' }}>Netto</div>
                    <div className="font-700 text-sm" style={{ color: netto >= 0 ? 'var(--c-green)' : '#dc2626' }}>{formatEuro(netto)}</div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Btn variant="ghost" className="flex-1 justify-center text-sm"
                    onClick={() => setModal({ edit: imm })}><Pencil/> Modifica</Btn>
                  <Btn variant="danger" className="text-xs"
                    onClick={() => ask(() => removeItem('immobili', imm.id), `Eliminare "${imm.nome}"?`)}><Trash2/></Btn>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {modal === 'new' && (
        <Modal title="Nuovo immobile" onClose={() => setModal(null)}>
          <ImmobileForm onSave={f => { addItem('immobili', f); setModal(null) }} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal?.edit && (
        <Modal title="Modifica immobile" onClose={() => setModal(null)}>
          <ImmobileForm init={modal.edit}
            onSave={f => { updateItem('immobili', modal.edit.id, f); setModal(null) }}
            onClose={() => setModal(null)} />
        </Modal>
      )}
      {ConfirmModal}
    </div>
  )
}