"use client";

import { Trash2 } from "lucide-react";

export default function BottoneElimina({
  action,
  messaggio = "Eliminare definitivamente",
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(messaggio)) e.preventDefault();
      }}
    >
      <button
        className="inline-flex rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
        title="Elimina"
      >
        <Trash2 size={16} />
      </button>
    </form>
  );
}
