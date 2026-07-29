import { soles } from "../services/publicApi";

/**
 * Resumen del viaje y de los asientos elegidos. `asientos` es la lista de asientos
 * seleccionados (1 a 5); el total suma el precio de cada uno según su tipo.
 */
export default function Resumen({ viaje, asientos = [], bebes = 0, children }) {
  if (!viaje) return null;

  const precioDe = (a) => (a && a.tipo === "VIP" ? viaje.precioVip : viaje.precioNormal) ?? viaje.precioNormal;
  const total = asientos.reduce((s, a) => s + Number(precioDe(a) || 0), 0);

  return (
    <aside className="resumen">
      <h3>Resumen</h3>
      <div className="linea"><span>Ruta</span><span>{viaje.origen} → {viaje.destino}</span></div>
      <div className="linea"><span>Fecha</span><span>{viaje.fechaSalida}</span></div>
      <div className="linea"><span>Hora</span><span>{viaje.horaSalida ? viaje.horaSalida.slice(0, 5) : "—"} h</span></div>
      {viaje.embarcacionNombre && <div className="linea"><span>Embarcación</span><span>{viaje.embarcacionNombre}</span></div>}
      {viaje.capitan && <div className="linea"><span>Capitán</span><span>{viaje.capitan}</span></div>}

      {asientos.length > 0 && (
        <div className="linea"><span>Pasajes</span><span>{asientos.length}</span></div>
      )}
      {asientos.map((a) => (
        <div className="linea" key={a.numero}>
          <span>Asiento #{a.numero} · {a.tipo}</span>
          <span>{soles(precioDe(a))}</span>
        </div>
      ))}
      {bebes > 0 && (
        <div className="linea"><span>Bebés (en brazos)</span><span>{bebes} · gratis</span></div>
      )}

      <div className="total"><span>Total</span><span>{soles(asientos.length ? total : (viaje.precioNormal ?? 0))}</span></div>
      {children}
    </aside>
  );
}
