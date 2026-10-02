export const eur = (n) =>
    n == null ? "—" : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

export const dataIt = (d) => (d ? new Date(d).toLocaleDateString("it-IT") : "—");