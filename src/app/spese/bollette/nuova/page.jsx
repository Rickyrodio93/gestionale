import FormBolletta from "@/components/FormBolletta";
import { datiForm } from "@/lib/datiBolletta";

export const dynamic = "force-dynamic"

export default async function Nuova() {
    const dati = await datiForm();
    return (
        <>
        <h1 className="mb-6 text-2xl font-bold">Nuova bolletta</h1>
        <FormBolletta {...dati}/>
        </>
    )
}