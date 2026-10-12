/* ============================================================
   MODO NOCHE — elegirlo, recordarlo y avisar quién lo cambió

   La decisión es de quien está sentado en esa máquina, no del sistema
   operativo: las del mostrador son compartidas y el turno de madrugada no es
   el mismo que el de la tarde. Por eso se guarda en el navegador y no se mira
   `prefers-color-scheme`.

   El tema se aplica también desde index.html, antes de que React arranque,
   para que no se vea un destello blanco al abrir.
   ============================================================ */
export const CLAVE = "rayza_tema";

export function temaGuardado() {
    try {
        const t = localStorage.getItem(CLAVE);
        return t === "oscuro" || t === "claro" ? t : "claro";
    } catch {
        // Navegador con el almacenamiento bloqueado: se trabaja de día.
        return "claro";
    }
}

export function aplicarTema(tema) {
    // Sin esto, medio panel se anima: cada elemento con `transition` cruza por
    // sus propios colores intermedios a distinta velocidad y durante un cuarto
    // de segundo hay texto que no se lee. Cambiar de tema no es un movimiento
    // que haya que mostrar: tiene que pasar y ya.
    const raiz = document.documentElement;
    raiz.classList.add("sin-transiciones");
    raiz.setAttribute("data-tema", tema);
    // Dos cuadros: uno para que el navegador aplique los colores nuevos y otro
    // para devolver las transiciones sin que alcancen a dispararse.
    requestAnimationFrame(() => requestAnimationFrame(() => {
        raiz.classList.remove("sin-transiciones");
    }));
    try {
        localStorage.setItem(CLAVE, tema);
    } catch {
        // Si no se puede guardar, al menos vale para esta sesión.
    }
    // Los gráficos leen sus colores del CSS una sola vez: hay que avisarles.
    window.dispatchEvent(new CustomEvent("rayza:tema", { detail: tema }));
}

export function alternarTema() {
    const nuevo = temaGuardado() === "oscuro" ? "claro" : "oscuro";
    aplicarTema(nuevo);
    return nuevo;
}

/* ── Para React ──
   Devuelve el tema actual y lo vuelve a pintar cuando alguien lo cambia desde
   cualquier parte de la aplicación. */
import { useEffect, useState } from "react";

export function useTema() {
    const [tema, setTema] = useState(temaGuardado);
    useEffect(() => {
        const alCambiar = (e) => setTema(e.detail);
        window.addEventListener("rayza:tema", alCambiar);
        return () => window.removeEventListener("rayza:tema", alCambiar);
    }, []);
    return tema;
}
