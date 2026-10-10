"use client";

import { useEffect } from "react";

export default function TemaIniziale() {
  useEffect(() => {
    if (/(^|; )tema=/.test(document.cookie)) return;
    const scuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", scuro);
  }, []);
  return null;
}
