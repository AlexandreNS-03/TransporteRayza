import { useEffect, useState } from "react";
import { getAsientos } from "../services/publicApi";

/**
 * Mapa de asientos con forma de embarcación, igual que el sistema de ventas:
 * proa/cabina (con el capitán) arriba, secciones VIP y Normal ordenadas según
 * `vipPosicion` de la embarcación, filas de 2 + pasillo + 2, y motor en la popa.
 * Muestra todos los asientos: los ocupados salen en gris y no son seleccionables.
 */
export default function MapaAsientos({ viaje, seleccionado, onSeleccionar }) {
  const [asientos, setAsientos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setAsientos(null); setError(null);
    getAsientos(viaje.id, viaje.ordenOrigen, viaje.ordenDestino)
      .then(setAsientos).catch((e) => setError(e.message));
  }, [viaje]);

  if (error) return <div className="alert alert-warn">{error}</div>;

  if (asientos === null) {
    return (
      <div className="barco">
        <div className="barco-proa"><span>Cargando…</span></div>
        <div className="barco-cubierta">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="fila" key={i}>
              <span className="skel" style={{ width: 52, height: 52 }} />
              <span className="skel" style={{ width: 52, height: 52 }} />
              <span className="pasillo" />
              <span className="skel" style={{ width: 52, height: 52 }} />
              <span className="skel" style={{ width: 52, height: 52 }} />
            </div>
          ))}
        </div>
        <div className="barco-popa"><span className="motor" /><span>Popa · Motor</span></div>
      </div>
    );
  }

  if (asientos.length === 0)
    return <div className="alert alert-info">Este viaje no tiene asientos configurados.</div>;

  // Orden de las secciones según dónde esté el VIP en esta embarcación.
  // POPA (por defecto) = VIP atrás → primero Normal, luego VIP.
  const secciones = viaje.vipPosicion === "PROA" ? ["VIP", "NORMAL"] : ["NORMAL", "VIP"];

  const chunk = (arr, n) => {
    const out = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  };

  const Boton = (a) => {
    const esVip = a.tipo === "VIP";
    const sel = seleccionado && seleccionado.numero === a.numero;
    return (
      <button
        key={a.numero}
        type="button"
        className={`asiento ${esVip ? "vip" : ""} ${!a.libre ? "ocupado" : ""} ${sel ? "sel" : ""}`}
        onClick={() => a.libre && onSeleccionar(a)}
        disabled={!a.libre}
        title={!a.libre ? "Ocupado" : `${esVip ? "VIP" : "Normal"} #${a.numero}`}
      >
        {a.numero}<small>{esVip ? "VIP" : ""}</small>
      </button>
    );
  };

  const renderSeccion = (tipo) => {
    const deTipo = asientos.filter((a) => a.tipo === tipo);
    if (deTipo.length === 0) return null;
    return (
      <div key={tipo}>
        <p className="barco-seccion-label">{tipo === "VIP" ? "⭐ VIP" : "💺 Normal"}</p>
        {chunk(deTipo, 4).map((fila, i) => (
          <div className="fila" key={i}>
            {fila.slice(0, 2).map(Boton)}
            <span className="pasillo" />
            {fila.slice(2, 4).map(Boton)}
          </div>
        ))}
      </div>
    );
  };

  const seccionesRender = secciones.map(renderSeccion).filter(Boolean);

  return (
    <div>
      <p className="muted center" style={{ marginBottom: 2 }}>Selecciona tu asiento</p>
      <div className="proa-label">⬆ proa (adelante)</div>
      <div className="barco">
        <div className="barco-proa">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4v4M12 16v4M4 12h4M16 12h4"/></svg>
          <span>Cabina{viaje.capitan ? ` — ${viaje.capitan}` : ""}</span>
        </div>
        <div className="barco-cubierta">
          {seccionesRender.map((s, i) => (
            <div key={i}>
              {i > 0 && <div className="barco-divisor" />}
              {s}
            </div>
          ))}
        </div>
        <div className="barco-popa">
          <span className="motor" />
          <span>Motor</span>
        </div>
      </div>
      <div className="popa-label">⬇ popa (atrás)</div>
      <div className="leyenda">
        <span><i className="chip" /> Disponible</span>
        <span><i className="chip" style={{ borderColor: "var(--gold)" }} /> VIP</span>
        <span><i className="chip" style={{ background: "var(--bg-softer)" }} /> Ocupado</span>
        <span><i className="chip" style={{ background: "var(--accent)", borderColor: "var(--accent)" }} /> Tu selección</span>
      </div>
    </div>
  );
}
