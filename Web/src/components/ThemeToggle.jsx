import { useEffect, useState } from "react";
import { IconSun, IconMoon } from "./Icons";

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

  // Aplica el tema en cada render, pero no guarda nada: así el modo "seguir
  // al sistema" (sin valor en localStorage) no se pierde solo por cargar la
  // página. Guardar es cosa del clic explícito, no de este efecto reactivo.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", oscuro ? "dark" : "light");
  }, [oscuro]);

  const elegir = () => {
    setOscuro((v) => {
      const nuevo = !v;
      localStorage.setItem("tema", nuevo ? "dark" : "light");
      return nuevo;
    });
  };

  return (
    <button
      type="button"
      className="tema-btn"
      onClick={elegir}
      aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={oscuro ? "Modo claro" : "Modo oscuro"}
    >
      {oscuro ? <IconSun /> : <IconMoon />}
    </button>
  );
}
