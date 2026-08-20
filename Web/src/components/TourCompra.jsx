import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Tutorial guiado de la compra en línea.
 *
 * Muchos visitantes llegan, ven el buscador y no saben que ahí mismo pueden
 * comprar. Esto los lleva de la mano por los cuatro campos hasta "Buscar", que
 * es donde empieza el embudo; lo que sigue (asientos, datos, pago) ya lo va
 * indicando la página de compra con sus propios pasos.
 *
 * Se guía sobre los controles reales en vez de una demostración aparte: el
 * recorte deja pasar los clics, así que el visitante puede ir eligiendo su
 * viaje mientras avanza y termina con la búsqueda hecha, no con una lección.
 */

const VISTO = "rayza_tour_visto";
const MARGEN = 8;        // aire entre el recorte y el borde del control
const SEPARACION = 14;   // distancia de la tarjeta al control

const PASOS = [
  {
    // Sin ancla: abre centrado, explicando para qué sirve el minuto que sigue.
    titulo: "Compra tu pasaje aquí mismo",
    texto: "Eliges tu asiento, pagas en línea y recibes tu boleto con QR. Te muestro cómo en cuatro pasos.",
  },
  {
    ancla: "origen",
    titulo: "¿De dónde sales?",
    texto: "El puerto donde subes al bote.",
  },
  {
    ancla: "destino",
    titulo: "¿A dónde vas?",
    texto: "Solo aparecen los destinos a los que llega esa ruta.",
  },
  {
    ancla: "fecha",
    titulo: "El día que viajas",
    texto: "Después verás el precio de los días cercanos, por si te conviene otro.",
  },
  {
    ancla: "buscar",
    titulo: "Listo, toca Buscar",
    texto: "Eliges tu asiento, pagas con tarjeta o Yape, y tu boleto llega al correo.",
    final: true,
  },
];

const esMovil = () => typeof window !== "undefined" && window.innerWidth < 720;

export default function TourCompra({ abierto, onCerrar }) {
  const [paso, setPaso] = useState(0);
  const [recorte, setRecorte] = useState(null);   // rect del control resaltado
  const tarjetaRef = useRef(null);

  const actual = PASOS[paso];

  // Al abrir siempre se empieza de cero: reabrirlo a la mitad sería desconcertante.
  useEffect(() => { if (abierto) setPaso(0); }, [abierto]);

  const medir = useCallback(() => {
    if (!abierto || !actual?.ancla) { setRecorte(null); return; }
    const el = document.querySelector(`[data-tour="${actual.ancla}"]`);
    if (!el) { setRecorte(null); return; }
    const r = el.getBoundingClientRect();
    setRecorte({ top: r.top - MARGEN, left: r.left - MARGEN,
                 ancho: r.width + MARGEN * 2, alto: r.height + MARGEN * 2 });
  }, [abierto, actual]);

  // Dejar el control en una franja donde se vea Y no quede debajo de la tarjeta.
  // En móvil la tarjeta se ancla al pie, así que hay que descontar su alto: si no,
  // el paso ilumina un campo que el propio tutorial está tapando.
  useEffect(() => {
    if (!abierto) return;
    if (!actual?.ancla) { setRecorte(null); return; }
    const el = document.querySelector(`[data-tour="${actual.ancla}"]`);
    if (!el) { setRecorte(null); return; }

    const r = el.getBoundingClientRect();
    const altoTarjeta = tarjetaRef.current?.offsetHeight || 230;
    const limiteArriba = 84;                                   // bajo la barra fija
    const limiteAbajo = esMovil()
      ? window.innerHeight - altoTarjeta - 28
      : window.innerHeight - 24;

    const fuera = r.top < limiteArriba || r.bottom > limiteAbajo;
    if (fuera) el.scrollIntoView({ block: "center", behavior: "smooth" });

    const t = setTimeout(medir, fuera ? 430 : 40);   // esperar el desplazamiento
    return () => clearTimeout(t);
  }, [abierto, paso, actual, medir]);

  useLayoutEffect(() => {
    if (!abierto) return;
    medir();
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, { passive: true });
    return () => {
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir);
    };
  }, [abierto, medir]);

  const cerrar = useCallback(() => {
    try { localStorage.setItem(VISTO, "1"); } catch { /* modo privado */ }
    onCerrar?.();
  }, [onCerrar]);

  useEffect(() => {
    if (!abierto) return;
    const onTecla = (e) => {
      if (e.key === "Escape") cerrar();
      else if (e.key === "ArrowRight" && paso < PASOS.length - 1) setPaso((p) => p + 1);
      else if (e.key === "ArrowLeft" && paso > 0) setPaso((p) => p - 1);
    };
    window.addEventListener("keydown", onTecla);
    return () => window.removeEventListener("keydown", onTecla);
  }, [abierto, paso, cerrar]);

  useEffect(() => { if (abierto) tarjetaRef.current?.focus(); }, [abierto, paso]);

  if (!abierto) return null;

  const ultimo = paso === PASOS.length - 1;

  // La tarjeta va bajo el control, o encima si abajo no cabe. En móvil se ancla
  // al pie: flotarla junto a un campo angosto la deja ilegible.
  // En móvil la tarjeta se va al techo cuando el campo está en la mitad de abajo,
  // y al pie cuando está arriba. Así nunca se para encima de lo que señala, sin
  // depender de que el desplazamiento llegue a tiempo.
  const ladoMovil = recorte && recorte.top > window.innerHeight / 2 ? "techo" : "pie";

  let estiloTarjeta = {};
  if (recorte && !esMovil()) {
    const alturaTarjeta = tarjetaRef.current?.offsetHeight || 168;
    const cabeAbajo = recorte.top + recorte.alto + SEPARACION + alturaTarjeta < window.innerHeight;
    const top = cabeAbajo ? recorte.top + recorte.alto + SEPARACION
                          : Math.max(12, recorte.top - SEPARACION - alturaTarjeta);
    const ancho = 320;
    const left = Math.min(Math.max(12, recorte.left + recorte.ancho / 2 - ancho / 2),
                          window.innerWidth - ancho - 12);
    estiloTarjeta = { top, left, width: ancho };
  }

  return (
    <div className="tour" role="dialog" aria-modal="false" aria-label="Cómo comprar tu pasaje">
      {/* Velo con un hueco sobre el control del paso. Va como máscara SVG y no
          como cuatro rectángulos ni un div que cambia de clase: así el nodo vive
          montado todo el recorrido y el hueco puede deslizarse de un campo al
          siguiente sin reiniciar la animación de entrada.
          No captura clics a propósito: el visitante puede ir llenando el
          buscador de verdad mientras lo guiamos. */}
      <svg className="tour-mascara" aria-hidden="true">
        <defs>
          <mask id="tour-hueco">
            <rect x="0" y="0" width="100%" height="100%" fill="#fff" />
            {recorte && (
              <rect className="tour-hueco-rect" rx="12"
                    x={recorte.left} y={recorte.top}
                    width={recorte.ancho} height={recorte.alto} fill="#000" />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(9,20,38,.62)" mask="url(#tour-hueco)" />
        {recorte && (
          <rect className="tour-aro" rx="12"
                x={recorte.left} y={recorte.top}
                width={recorte.ancho} height={recorte.alto} />
        )}
      </svg>

      <div
        ref={tarjetaRef}
        tabIndex={-1}
        className={"tour-tarjeta"
          + (recorte && !esMovil() ? " anclada" : " centrada")
          + (recorte ? " " + ladoMovil : "")}
        style={estiloTarjeta}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tour-progreso" aria-hidden="true">
          {PASOS.map((_, i) => (
            <span key={i} className={"tour-punto" + (i === paso ? " activo" : i < paso ? " hecho" : "")} />
          ))}
        </div>

        <h3>{actual.titulo}</h3>
        <p>{actual.texto}</p>

        <div className="tour-acciones">
          {/* En el último paso "Entendido" ya cierra: un segundo botón que hace
              lo mismo solo obliga a elegir entre dos puertas iguales. */}
          {!ultimo ? (
            <button type="button" className="tour-saltar" onClick={cerrar}>Saltar</button>
          ) : <span />}
          <div className="tour-navegacion">
            {paso > 0 && (
              <button type="button" className="tour-atras" onClick={() => setPaso((p) => p - 1)}>
                Atrás
              </button>
            )}
            {ultimo ? (
              <button type="button" className="btn btn-primary tour-siguiente" onClick={cerrar}>
                Entendido
              </button>
            ) : (
              <button type="button" className="btn btn-primary tour-siguiente" onClick={() => setPaso((p) => p + 1)}>
                Siguiente
              </button>
            )}
          </div>
        </div>

        <span className="tour-conteo">{paso + 1} de {PASOS.length}</span>
      </div>
    </div>
  );
}

/** ¿Es la primera visita? Sirve para abrirlo solo, una vez. */
export function tourPendiente() {
  try { return !localStorage.getItem(VISTO); } catch { return false; }
}
