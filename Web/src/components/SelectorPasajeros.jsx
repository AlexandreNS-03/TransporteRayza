import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Selector de pasajeros con categorías, estilo desplegable:
 *  - Adultos (18+) y Niños (5-17): ocupan asiento y pagan el precio del tramo.
 *  - Bebés (<5): viajan en brazos, sin asiento y gratis; máximo 1 por adulto.
 *
 * Los asientos a elegir = adultos + niños, con tope `maxAsientos`. `valor` es
 * { adultos, ninos, bebes } y onChange devuelve el nuevo objeto.
 */
export default function SelectorPasajeros({ valor, onChange, maxAsientos = 5 }) {
  const { adultos, ninos, bebes } = valor;
  const asientos = adultos + ninos;
  const total = adultos + ninos + bebes;
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [abierto]);

  const set = (cambios) => onChange({ ...valor, ...cambios });

  const Fila = ({ titulo, sub, campo, valorFila, menos, mas, masOff, menosOff }) => (
    <div className="pax-fila">
      <div>
        <div className="pax-fila-t">{titulo}</div>
        <div className="pax-fila-s">{sub}</div>
      </div>
      <div className="pax-stepper">
        <button type="button" aria-label={`Menos ${titulo}`} disabled={menosOff} onClick={menos}>−</button>
        <span>{valorFila}</span>
        <button type="button" aria-label={`Más ${titulo}`} disabled={masOff} onClick={mas}>+</button>
      </div>
    </div>
  );

  return (
    <div className="pax-selector" ref={ref}>
      <button type="button" className="pax-toggle" onClick={() => setAbierto((v) => !v)}>
        <span className="pax-label">
          N° pasajeros: <b>{total} {total === 1 ? "pasajero" : "pasajeros"}</b>
        </span>
        <span className={`pax-caret ${abierto ? "up" : ""}`}>▾</span>
      </button>

      {abierto && (
        <div className="pax-panel">
          <Fila
            titulo="Adultos" sub="De 18 en adelante" valorFila={adultos}
            menos={() => set({ adultos: adultos - 1, bebes: Math.min(bebes, adultos - 1) })}
            mas={() => set({ adultos: adultos + 1 })}
            menosOff={adultos <= 1}
            masOff={asientos >= maxAsientos}
          />
          <Fila
            titulo="Niños" sub="De 5 a 17 años" valorFila={ninos}
            menos={() => set({ ninos: ninos - 1 })}
            mas={() => set({ ninos: ninos + 1 })}
            menosOff={ninos <= 0}
            masOff={asientos >= maxAsientos}
          />
          <Fila
            titulo="Bebés" sub="Menores de 5 años · en brazos" valorFila={bebes}
            menos={() => set({ bebes: bebes - 1 })}
            mas={() => set({ bebes: bebes + 1 })}
            menosOff={bebes <= 0}
            masOff={bebes >= adultos}
          />

          <p className="pax-nota">
            Máximo {maxAsientos} asientos por compra. Los bebés viajan en brazos, sin asiento.
          </p>
          <Link to="/clausulas" className="pax-cond">ⓘ Condiciones para el viaje</Link>
        </div>
      )}
    </div>
  );
}
