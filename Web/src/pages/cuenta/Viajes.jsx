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
      <div className="steps" style={{ justifyContent: "flex-start", marginTop: 16 }}>
        {[["proximos", `Próximos (${proximos.length})`], ["historial", `Historial (${historial.length})`]]
          .map(([k, label]) => (
            <button key={k} className={`btn ${ver === k ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setVer(k)}>{label}</button>
          ))}
      </div>

      {error ? (
        <div className="alert alert-warn" style={{ marginTop: 24 }}>
          No pudimos cargar tus viajes. <button className="btn-link" onClick={cargar}>Reintentar</button>
        </div>
      ) : (
        <ListaViajes viajes={lista} vacio={ver === "proximos"
          ? "No tienes viajes próximos. ¡Compra tu pasaje!"
          : "Aún no tienes viajes en tu historial."} />
      )}
    </CuentaLayout>
  );
}
