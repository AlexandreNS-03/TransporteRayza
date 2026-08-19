import { useState } from "react";
import { soles } from "../services/publicApi";

const hhmm = (h) => (h ? String(h).slice(0, 5) : "—");

/**
 * Una opción de viaje. La lee así el pasajero: a qué hora sale, cuánto dura, a
 * qué hora llega y cuánto cuesta. Las paradas intermedias quedan detrás de un
 * botón porque solo las mira quien baja en el camino.
 */
function FilaViaje({ v, onElegir }) {
  const [abierto, setAbierto] = useState(false);

  const paradas = v.itinerario || [];
  const llegada = paradas.length > 1 ? paradas[paradas.length - 1].horaEstimada : null;
  const intermedias = Math.max(0, paradas.length - 2);
  const agotado = v.asientosLibres === 0;

  return (
    <article className={"viaje-row" + (agotado ? " agotado" : "")}>
      <div className="viaje-datos">
        <div className="viaje-trayecto">
          <div className="viaje-punta">
            <span className="viaje-hora">{hhmm(v.horaSalida)}</span>
            <span className="viaje-lugar">{v.origen}</span>
          </div>

          <div className="viaje-medio" aria-hidden="true">
            <span className="viaje-linea" />
            {v.duracionAproximada && <span className="viaje-duracion">{v.duracionAproximada}</span>}
            <span className="viaje-linea" />
          </div>

          <div className="viaje-punta">
            <span className="viaje-hora">{hhmm(llegada)}</span>
            <span className="viaje-lugar">{v.destino}</span>
          </div>
        </div>

        <p className="viaje-meta">
          {v.fechaSalida}
          {v.embarcacionNombre ? ` · ${v.embarcacionNombre}` : ""}
          {agotado ? "" : ` · ${v.asientosLibres} asientos libres`}
        </p>

        {paradas.length > 1 && (
          <>
            <button
              type="button"
              className="viaje-tramos-btn"
              onClick={() => setAbierto((a) => !a)}
              aria-expanded={abierto}
            >
              {intermedias === 0
                ? "Directo"
                : `${intermedias} ${intermedias === 1 ? "parada" : "paradas"}`}
              <svg className={"viaje-chevron" + (abierto ? " abierto" : "")}
                   viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2"
                      strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className={"viaje-tramos" + (abierto ? " abierto" : "")}>
              <div className="viaje-tramos-inner">
                <ol className="itinerario-lista">
                  {paradas.map((e) => (
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
              </div>
            </div>
          </>
        )}
      </div>

      <div className="viaje-precio-bloque">
        {v.enOferta && <span className="badge-oferta">OFERTA</span>}
        <span className="viaje-desde">Desde</span>
        {v.enOferta && <span className="precio-regular">{soles(v.precioNormalRegular)}</span>}
        <span className="precio">{soles(v.precioNormal)}</span>
      </div>

      <button className="btn btn-primary viaje-elegir" disabled={agotado} onClick={() => onElegir(v)}>
        {agotado ? "Agotado" : "Elegir"}
      </button>
    </article>
  );
}

export default function Resultados({ viajes, cargando, error, onElegir }) {
  if (cargando) return <div className="spinner" />;
  if (error) return <div className="alert alert-warn">{error}</div>;
  if (!viajes) return null;
  if (viajes.length === 0)
    return <div className="alert alert-info">No encontramos viajes disponibles para esa búsqueda. Prueba con otra fecha o ruta.</div>;

  return (
    <div className="viajes-lista">
      {viajes.map((v) => (
        <FilaViaje key={v.id + v.ordenOrigen + v.ordenDestino} v={v} onElegir={onElegir} />
      ))}
    </div>
  );
}
