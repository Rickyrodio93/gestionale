export const dataAcq = (u) => u?.dataAcquisto ?? u?.palazzina?.dataAcquisto ?? null;
export const dataVend = (u) => u?.dataVendita ?? u?.palazzina?.dataVendita ?? null;