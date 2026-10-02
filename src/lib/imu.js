// moltiplicatori per categoria catastale (l'ordine conta: le eccezioni prima)
const MOLT = [
    [/^A\/10$/, 80], [/^D\/5$/, 80],
    [/^A\//, 160], [/^C\/(2|6|7)$/, 160],
    [/^B\//, 140], [/^C\/(3|4|5)$/, 140],
    [/^C\/1$/, 55], [/^D\//, 65],
];

export function imuStimata({ rendita, categoria, aliquotaImu, quotaPossesso = 100 }) {
    const molt = MOLT.find(([re]) => re.test(categoria))?.[1];
    if (!molt || !rendita || aliquotaImu == null) return null;
    return +(rendita * 1.05 * molt * (aliquotaImu / 1000) * (quotaPossesso / 100)).toFixed(2);
}

export function valoreCatastale({ rendita, categoria }) {
    const molt = MOLT.find(([re]) => re.test(categoria))?.[1];
    if (!molt || !rendita) return null;
    return +(rendita * 1.05 * molt).toFixed(2);
}