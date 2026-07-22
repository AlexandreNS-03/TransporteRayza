import { soles } from "../services/publicApi";

export default function Resultados({ viajes, cargando, error, onElegir }) {
  if (cargando) return <div className="spinner" />;
  if (error) return <div className="alert alert-warn">{error}</div>;
  if (!viajes) return null;
  if (viajes.length === 0)
    return <div className="alert alert-info">No encontramos viajes disponibles para esa búsqueda. Prueba con otra fecha o ruta.</div>;

  return (
    <div>
      {viajes.map((v) => (
        <div className="viaje-row" key={v.id + v.ordenOrigen + v.ordenDestino}>
          <div>
            <div className="ruta">{v.origen} → {v.destino}</div>
            <div className="meta">
              {v.fechaSalida} · {v.horaSalida ? v.horaSalida.slice(0, 5) : "—"} h
              {v.embarcacionNombre ? ` · ${v.embarcacionNombre}` : ""}
              {v.duracionAproximada ? ` · ${v.duracionAproximada}` : ""}
            </div>
            <div style={{ marginTop: 8 }}>
              <span className="tag">{v.asientosLibres} asientos libres</span>
            </div>
          </div>
          <div className="center">
            <div className="meta">Desde</div>
            <div className="precio">{soles(v.precioNormal)}</div>
          </div>
          <button className="btn btn-primary" disabled={v.asientosLibres === 0} onClick={() => onElegir(v)}>
            {v.asientosLibres === 0 ? "Agotado" : "Elegir"}
          </button>
        </div>
      ))}
    </div>
  );
}
