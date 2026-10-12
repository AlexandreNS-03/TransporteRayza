/* ============================================================
   LENGUAJE DE LOS GRÁFICOS — Transportes Rayza

   Todos los gráficos del sistema se dibujan igual: misma reja, mismos ejes,
   mismo globo de datos y la misma paleta. Antes cada uno traía sus colores y
   su reja escritos a mano, así que dos gráficos en la misma pantalla no se
   parecían entre sí.

   Los colores salen de theme.css. No se pueden pasar como var(--token) porque
   Recharts los escribe como atributos del SVG, y ahí var() no se resuelve: se
   leen una vez en el navegador y se guardan.
   ============================================================ */
import { useMemo } from "react";

const RESPALDO = {
    azul:     "#1a4db5",
    verde:    "#15803d",
    ambar:    "#a16207",
    morado:   "#7c3aed",
    cyan:     "#0891b2",
    rojo:     "#b91c1c",
    reja:     "#e2e8f0",
    eje:      "#6b7280",
    etiqueta: "#374151",
    realce:   "#f8fafc",
};

const TOKEN = {
    azul:     "--color-primario",
    verde:    "--color-exito",
    ambar:    "--color-advertencia",
    morado:   "--color-morado",
    cyan:     "--color-info",
    rojo:     "--color-peligro",
    reja:     "--color-borde-suave",
    eje:      "--color-texto-suave",
    etiqueta: "--color-gris-texto",
    realce:   "--color-fondo",
};

let cache = null;

/** Los colores del tema, leídos del CSS una sola vez. */
export function paleta() {
    if (cache) return cache;
    if (typeof window === "undefined") return RESPALDO;
    const raiz = getComputedStyle(document.documentElement);
    let resuelto = false;
    const leido = Object.fromEntries(
        Object.entries(TOKEN).map(([nombre, token]) => {
            const valor = raiz.getPropertyValue(token).trim();
            if (valor) resuelto = true;
            return [nombre, valor || RESPALDO[nombre]];
        })
    );
    // Si todavía no hay hoja de estilos aplicada, esto devuelve los respaldos
    // pero no los guarda: la próxima llamada vuelve a mirar el CSS.
    if (resuelto) cache = leido;
    return leido;
}

/** Orden en que se reparten los colores cuando hay varias series o porciones. */
export function serie(i) {
    const p = paleta();
    const orden = [p.azul, p.verde, p.ambar, p.morado, p.cyan, p.rojo];
    return orden[i % orden.length];
}

/* ── Piezas comunes ──
   Se usan como {...reja()} dentro del gráfico. La reja va solo en horizontal:
   las líneas verticales compiten con las barras y no ayudan a leer un valor. */

export function reja({ horizontal = true } = {}) {
    return {
        stroke: paleta().reja,
        strokeDasharray: "0",
        vertical: !horizontal,
        horizontal,
    };
}

export function ejeX(extra = {}) {
    return {
        tick: { fontSize: 11, fill: paleta().eje },
        axisLine: false,
        tickLine: false,
        dy: 4,
        ...extra,
    };
}

export function ejeY(extra = {}) {
    return {
        tick: { fontSize: 11, fill: paleta().eje },
        axisLine: false,
        tickLine: false,
        width: 54,
        ...extra,
    };
}

/** Eje de categorías (el de la izquierda en los gráficos horizontales). */
export function ejeCategoria(extra = {}) {
    return {
        type: "category",
        tick: { fontSize: 11, fill: paleta().etiqueta },
        axisLine: false,
        tickLine: false,
        ...extra,
    };
}

/** El sombreado que sigue al puntero. Sin esto, Recharts pinta un gris fuerte. */
export function realce(vertical = false) {
    return vertical
        ? { fill: paleta().realce }
        : { stroke: paleta().reja, strokeWidth: 1 };
}

/* ── Globo de datos ──
   Una tarjeta, no el recuadro por defecto de Recharts. `formato` recibe el
   valor y el nombre de la serie, y devuelve el texto ya listo. */
export function GloboDatos({ active, payload, label, formato }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="grafico-globo">
            {label !== undefined && label !== "" && <strong>{label}</strong>}
            {payload.map((p, i) => (
                <div key={i} className="grafico-globo-fila">
                    <span className="grafico-globo-punto" style={{ background: p.color || p.fill }} />
                    <span className="grafico-globo-nombre">{p.name}</span>
                    <span className="grafico-globo-valor">
                        {formato
                            ? formato(p.value, p.name, p)
                            : typeof p.value === "number"
                                ? p.value.toLocaleString("es-PE")
                                : p.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

/* ── Leyenda ──
   Va en la cabecera del gráfico, no flotando debajo: así el gráfico ocupa
   todo el alto de su caja y la leyenda se lee antes de mirar los datos. */
export function Leyenda({ series }) {
    return (
        <div className="grafico-leyenda">
            {series.map((s) => (
                <span key={s.nombre} className="grafico-leyenda-item">
                    <span className="grafico-leyenda-punto" style={{ background: s.color }} />
                    {s.nombre}
                </span>
            ))}
        </div>
    );
}

/* ── Degradado bajo la línea ──
   El área no se rellena de color plano: se desvanece hacia abajo. Hay que
   darle un id único por gráfico porque el SVG los busca por nombre. */
export function Degradado({ id, color, opacidad = 0.22 }) {
    return (
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={opacidad} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
    );
}

/** Punto solo en el último dato: marca dónde termina la serie, que es el dato
 *  que se mira primero. Los demás puntos solo ensucian la línea. */
export function puntoFinal(total, color) {
    return function Punto(props) {
        const { cx, cy, index } = props;
        if (index !== total - 1 || cx == null || cy == null) return null;
        return (
            <g>
                <circle cx={cx} cy={cy} r={5} fill={color} fillOpacity={0.18} />
                <circle cx={cx} cy={cy} r={3} fill={color} />
            </g>
        );
    };
}

/** Atajo para no repetir useMemo en cada pantalla. */
export function usarPaleta() {
    return useMemo(() => paleta(), []);
}
