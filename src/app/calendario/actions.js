"use server";
import { revalidatePath } from "next/cache";
import { sincronizzaTutte } from "@/lib/sincronizzaIcal";

export async function sincronizzaOra() {
    await sincronizzaTutte({ forza: true });
    revalidatePath("/calendario");
}