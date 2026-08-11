import { useEffect } from "react";

/**
 * Comportamiento de teclado y foco para todos los modales del sistema.
 *
 * Los 23 modales están escritos a mano y ninguno cerraba con Esc, ninguno
 * bloqueaba el desplazamiento de la página de atrás y solo uno atrapaba el foco:
 * navegando con teclado uno se salía del modal hacia la pantalla de abajo sin
 * darse cuenta, con el modal todavía encima.
 *
 * Se resuelve en un solo lugar y no modal por modal a propósito. Son pantallas de
 * cobro en producción: 23 ediciones a mano tienen más probabilidad de romper algo
 * que un observador que se apoya en lo que todos ya comparten, que es la capa de
 * fondo (.modal-overlay) y el hecho de que hacer clic en ella cierra.
 *
 * Cubre además a los modales que se agreguen después, sin que nadie se acuerde.
 * Si alguno necesitara quedar fuera, se le pone data-sin-gestion.
 */

const CAPAS = ".modal-overlay, .aviso-overlay";

const FOCALIZABLES = [
    "a[href]", "button:not([disabled])", "input:not([disabled])",
    "select:not([disabled])", "textarea:not([disabled])", "[tabindex]:not([tabindex='-1'])",
].join(",");

/** Lo que se puede enfocar dentro del modal, en orden y sin lo que está oculto. */
function focalizables(capa) {
    return [...capa.querySelectorAll(FOCALIZABLES)]
        .filter(el => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement);
}

export default function GestorModales() {
    useEffect(() => {
        let capaActiva = null;
        let focoPrevio = null;

        const bloquearFondo = () => {
            // Se compensa el ancho de la barra de desplazamiento: sin esto la
            // página da un salto lateral al abrir el modal.
            const barra = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.overflow = "hidden";
            if (barra > 0) document.body.style.paddingRight = `${barra}px`;
        };

        // Se limpian los estilos en vez de restaurar los de antes: si algo dejara
        // la página bloqueada, restaurar "lo que había" devolvería justamente el
        // estado roto. Nada más en el sistema escribe estos dos estilos.
        const soltarFondo = () => {
            document.body.style.overflow = "";
            document.body.style.paddingRight = "";
        };

        const alTeclear = (e) => {
            if (!capaActiva) return;

            if (e.key === "Escape") {
                e.preventDefault();
                // Todos los modales ya cierran al hacer clic en el fondo: se
                // reutiliza ese camino en vez de inventar uno nuevo por pantalla.
                capaActiva.click();
                return;
            }

            if (e.key !== "Tab") return;
            const lista = focalizables(capaActiva);
            if (lista.length === 0) { e.preventDefault(); return; }

            const primero = lista[0];
            const ultimo = lista[lista.length - 1];
            if (e.shiftKey && document.activeElement === primero) {
                e.preventDefault();
                ultimo.focus();
            } else if (!e.shiftKey && document.activeElement === ultimo) {
                e.preventDefault();
                primero.focus();
            } else if (!capaActiva.contains(document.activeElement)) {
                // El foco se escapó (por ejemplo tras cerrar algo dentro): se trae.
                e.preventDefault();
                primero.focus();
            }
        };

        const abrir = (capa) => {
            capaActiva = capa;
            focoPrevio = document.activeElement;
            bloquearFondo();

            // El panel es el hijo de la capa: se marca como diálogo para que los
            // lectores de pantalla anuncien que lo de atrás quedó suspendido.
            const panel = capa.firstElementChild;
            if (panel && !panel.getAttribute("role")) {
                panel.setAttribute("role", "dialog");
                panel.setAttribute("aria-modal", "true");
                if (!panel.hasAttribute("tabindex")) panel.setAttribute("tabindex", "-1");
            }

            // Al primer campo, que es lo que la persona viene a llenar. Sin esperar
            // un instante el modal todavía no terminó de montarse.
            setTimeout(() => {
                if (capaActiva !== capa) return;
                const lista = focalizables(capa);
                (lista[0] || panel)?.focus?.();
            }, 30);
        };

        const cerrar = () => {
            capaActiva = null;
            soltarFondo();
            // Devolver el foco a donde estaba: si no, al cerrar el modal el teclado
            // vuelve al principio de la página.
            if (focoPrevio?.isConnected) focoPrevio.focus?.();
            focoPrevio = null;
        };

        const revisar = () => {
            const capa = [...document.querySelectorAll(CAPAS)]
                .filter(c => !c.hasAttribute("data-sin-gestion"))
                .pop() || null;                       // el último abierto es el de arriba

            if (capa === capaActiva) return;
            if (capaActiva) cerrar();
            if (capa) abrir(capa);
        };

        const observador = new MutationObserver(revisar);
        observador.observe(document.body, { childList: true, subtree: true });
        document.addEventListener("keydown", alTeclear, true);
        revisar();

        return () => {
            observador.disconnect();
            document.removeEventListener("keydown", alTeclear, true);
            soltarFondo();
        };
    }, []);

    return null;
}
