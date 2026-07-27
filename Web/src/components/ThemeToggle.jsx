import { useEffect, useState } from "react";

/**
 * Botón claro/oscuro. Guarda la preferencia en el navegador y la aplica con
 * data-theme en <html>, que gana sobre la preferencia del sistema.
 */
function temaGuardado() {
  return localStorage.getItem("tema"); // "light" | "dark" | null (=sistema)
}

export function aplicarTemaInicial() {
  const t = temaGuardado();
  if (t) document.documentElement.setAttribute("data-theme", t);
}

export default function ThemeToggle() {
  const [oscuro, setOscuro] = useState(() => {
    const t = temaGuardado();
    if (t) return t === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    const t = oscuro ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("tema", t);
  }, [oscuro]);

  return (
    <button
      type="button"
      className="tema-btn"
      onClick={() => setOscuro((v) => !v)}
      aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={oscuro ? "Modo claro" : "Modo oscuro"}
    >
      {oscuro ? "☀️" : "🌙"}
    </button>
  );
}
