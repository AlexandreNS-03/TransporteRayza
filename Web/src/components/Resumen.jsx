import { soles } from "../services/publicApi";

export default function Resumen({ viaje, asiento, children }) {
  if (!viaje) return null;
  const esVip = asiento && asiento.tipo === "VIP";
  const precio = esVip ? viaje.precioVip : viaje.precioNormal;

  return (
    <aside className="resumen">
      <h3>Resumen</h3>
      <div className="linea"><span>Ruta</span><span>{viaje.origen} → {viaje.destino}</span></div>
      <div className="linea"><span>Fecha</span><span>{viaje.fechaSalida}</span></div>
      <div className="linea"><span>Hora</span><span>{viaje.horaSalida ? viaje.horaSalida.slice(0, 5) : "—"} h</span></div>
      {viaje.embarcacionNombre && <div className="linea"><span>Embarcación</span><span>{viaje.embarcacionNombre}</span></div>}
      {viaje.capitan && <div className="linea"><span>Capitán</span><span>{viaje.capitan}</span></div>}
      {asiento && <div className="linea"><span>Asiento</span><span>#{asiento.numero} · {asiento.tipo}</span></div>}
      <div className="total"><span>Total</span><span>{soles(precio ?? viaje.precioNormal)}</span></div>
      {children}
    </aside>
  );
}
