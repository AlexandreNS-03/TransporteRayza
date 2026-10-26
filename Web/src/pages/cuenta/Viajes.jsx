import { useState, useEffect } from "react";
import CuentaLayout from "../../components/CuentaLayout";
import ListaViajes from "../../components/ListaViajes";
import { getMisViajes } from "../../services/authCliente";

export default function Viajes() {
  const [viajes, setViajes] = useState([]);
  const [error, setError] = useState(false);
  const [ver, setVer] = useState("proximos");

  const cargar = () => {
    setError(false);
    getMisViajes().then(setViajes).catch(() => setError(true));
  };
  useEffect(() => { cargar(); }, []);

  const proximos  = viajes.filter((v) => v.proximo && v.estado === "PAGADO");
  const historial = viajes.filter((v) => !v.proximo || v.estado !== "PAGADO");
  const lista = ver === "proximos" ? proximos : historial;

  return (
    <CuentaLayout titulo="Mis viajes">
      {/* Solapas de verdad, no botones: se anuncian como tales y se recorren
          con las flechas, que es lo que espera quien usa el teclado. */}
      <div className="viajes-solapas" role="tablist" aria-label="Qué viajes ver">
        {[["proximos", "Próximos", proximos.length],
          ["historial", "Historial", historial.length]].map(([k, label, n]) => (
          <button
            key={k}
            role="tab"
            id={`solapa-${k}`}
            aria-selected={ver === k}
            aria-controls="lista-de-viajes"
            tabIndex={ver === k ? 0 : -1}
            className="viajes-solapa"
            onClick={() => setVer(k)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
              e.preventDefault();
              setVer(ver === "proximos" ? "historial" : "proximos");
            }}>
            {label} <span className="viajes-solapa-cuenta">({n})</span>
          </button>
        ))}
      </div>

      <div id="lista-de-viajes" role="tabpanel" aria-labelledby={`solapa-${ver}`}>
        {error ? (
          <div className="alert alert-warn">
            No pudimos cargar tus viajes. <button className="btn-link" onClick={cargar}>Reintentar</button>
          </div>
        ) : (
          <ListaViajes viajes={lista} vacio={ver === "proximos"
            ? "No tienes viajes próximos. Cuando compres un pasaje va a aparecer acá."
            : "Todavía no tienes viajes anteriores."} />
        )}
      </div>
    </CuentaLayout>
  );
}
