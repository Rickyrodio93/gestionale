import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'gestionale_v1'

const defaultData = {
    immobili: [
        { id: '1', nome: 'Via morosini, 17, Varese', tipo: 'appartamento', mq: 104, piano: 3, note: 'trilocale con balcone' },
        { id: '2', nome: 'via Postumia, 3, Varese', tipo: 'appartamento', mq: 55, piano: 4, note: 'Monolocale ristrutturato' },
    ],
    spese: [
        { id: '1', immobileId: '1', categoria: 'luce', fornitore: 'Enel', importo: 87.50, data: '2025-03-10', note: 'Bolletta bimestrale', ricorrente: true, frequenza: 'bimestrale' },
        { id: '2', immobileId: '1', categoria: 'gas', fornitore: 'Eni Gas', importo: 124.00, data: '2025-03-15', note: '', ricorrente: true, frequenza: 'bimestrale' },
        { id: '3', immobileId: '2', categoria: 'condominio', fornitore: 'Amm. Bianchi', importo: 180.00, data: '2025-03-01', note: 'Quota trimestrale', ricorrente: true, frequenza: 'trimestrale' },
    ],
    rendite: [
        { id: '1', immobileId: '1', tipo: 'lungo', inquilino: 'Marco Esposito', importo: 1100, dataInizio: '2024-01-01', dataFine: '2025-12-31', giornoPagamento: 5, note: 'Contratto 4+4', pagamenti: ['2025-01', '2025-02', '2025-03'] },
        {
            id: '2', immobileId: '2', tipo: 'breve', piattaforma: 'Airbnb', importoNotte: 75, note: 'Gestito direttamente', prenotazioni: [
                { id: 'p1', da: '2025-03-10', a: '2025-03-14', ospite: 'Luisa Ferri', totale: 300 },
                { id: 'p2', da: '2025-03-20', a: '2025-03-23', ospite: 'Klaus Weber', totale: 225 },
            ]
        },
    ],
    lavori: [
        {
            id: '1', immobileId: '1', titolo: 'Rifacimento bagno', stato: 'completato',
            dataInizio: '2024-10-01', dataFine: '2024-11-15',
            voci: [
                { id: 'v1', descrizione: 'Piastrelle bagno 30x60', um: 'mq', quantita: 8, prezzoUnitario: 35, categoria: 'materiali' },
                { id: 'v2', descrizione: 'Posa piastrelle', um: 'mq', quantita: 8, prezzoUnitario: 45, categoria: 'manodopera' },
                { id: 'v3', descrizione: 'Sanitari completi', um: 'pz', quantita: 1, prezzoUnitario: 680, categoria: 'materiali' },
                { id: 'v4', descrizione: 'Idraulico installazione', um: 'ore', quantita: 12, prezzoUnitario: 55, categoria: 'manodopera' },
            ],
            note: 'Bagno principale'
        },
    ]
}

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) return JSON.parse(raw)
    } catch (e) { }
    return defaultData
}

function save(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch (e) { }
}

export function useStore() {
    const [data, setData] = useState(load)

    useEffect(() => { save(data) }, [data])

    const update = useCallback((key, value) => {
        setData(prev => ({ ...prev, [key]: value }))
    }, [])

    const addItem = useCallback((key, item) => {
        setData(prev => ({ ...prev, [key]: [...prev[key], { ...item, id: Date.now().toString() }] }))
    }, [])

    const removeItem = useCallback((key, id) => {
        setData(prev => ({ ...prev, [key]: prev[key].filter(x => x.id !== id) }))
    }, [])

    const updateItem = useCallback((key, id, changes) => {
        setData(prev => ({
            ...prev,
            [key]: prev[key].map(x => x.id === id ? { ...x, ...changes } : x)
        }))
    }, [])

    return { data, update, addItem, removeItem, updateItem }
}

export const CATEGORIE_SPESA = [
    { value: 'luce', label: 'Luce', emoji: '⚡' },
    { value: 'gas', label: 'Gas', emoji: '🔥' },
    { value: 'acqua', label: 'Acqua', emoji: '💧' },
    { value: 'internet', label: 'Internet', emoji: '📶' },
    { value: 'condominio', label: 'Condominio', emoji: '🏢' },
    { value: 'assicurazione', label: 'Assicurazione', emoji: '🛡️' },
    { value: 'imu', label: 'IMU / Tasse', emoji: '📋' },
    { value: 'manutenzione', label: 'Manutenzione', emoji: '🔧' },
    { value: 'altro', label: 'Altro', emoji: '📌' },
]

export const CATEGORIE_VOCE = [
    { value: 'materiali', label: 'Materiali' },
    { value: 'manodopera', label: 'Manodopera' },
    { value: 'trasporto', label: 'Trasporto' },
    { value: 'altro', label: 'Altro' },
]

export const UM_OPTIONS = ['mq', 'ml', 'pz', 'ore', 'kg', 'lt', 'corpo']

export function formatEuro(n) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n || 0)
}

export function formatDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('it-IT')
}