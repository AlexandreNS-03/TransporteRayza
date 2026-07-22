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

            {/* Guía de llegada: por dónde pasa el bote y a qué hora aproximada */}
            {v.itinerario?.length > 1 && (
              <details className="itinerario">
                <summary>Ver paradas y horas aproximadas</summary>
                <ol className="itinerario-lista">
                  {v.itinerario.map((e) => (
                    <li key={e.orden}>
                      <span className="itinerario-punto" />
                      <span className="itinerario-nombre">{e.nombre}</span>
                      <span className="itinerario-hora">{e.horaEstimada || "—"}</span>
                    </li>
                  ))}
                </ol>
                <p className="itinerario-nota">
                  Horas referenciales; pueden variar según el río y el clima.
                </p>
              </details>
            )}
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
