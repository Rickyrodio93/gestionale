"use client"

import { Printer } from "lucide-react"

export default function BottoneStampa(){
    return (
        <button onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
            <Printer size={14} /> Stampa / PDF
        </button>
    )
}