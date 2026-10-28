import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CuentaLayout from "../../components/CuentaLayout";
import Credencial from "../../components/Credencial";
import ViajesCancelados from "../../components/ViajesCancelados";
import ListaViajes from "../../components/ListaViajes";
import { getMisViajes } from "../../services/authCliente";

/**
 * Lo primero que ve el cliente al entrar: lo que tiene que resolver y lo que
 * viene. El resto de la cuenta se visita cuando hace falta; esto se mira.
 */
export default function Resumen() {
  const [viajes, setViajes] = useState([]);
  const [error, setError] = useState(false);

  const cargar = () => {
    setError(false);
    getMisViajes().then(setViajes).catch(() => setError(true));
  };
  useEffect(() => { cargar(); }, []);

  const proximos = viajes.filter((v) => v.proximo && v.estado === "PAGADO");

  return (
    <CuentaLayout titulo="Resumen">
      {(perfil) => (
        <>
          {/* La credencial arriba: es la tarjeta de la cuenta y lo que se
              muestra en el mostrador. */}
          <Credencial perfil={perfil} />

          {/* Después lo único que el cliente necesita resolver. */}
          <ViajesCancelados />

          <h3 style={{ marginTop: 30 }}>Tus próximos viajes</h3>
          {error ? (
            <div className="alert alert-warn" style={{ marginTop: 16 }}>
              No pudimos cargar tus viajes.{" "}
              <button className="btn-link" onClick={cargar}>Reintentar</button>
            </div>
          ) : (
            <ListaViajes viajes={proximos} vacio="No tienes viajes próximos. ¡Compra tu pasaje!" />
          )}

          <p className="meta" style={{ marginTop: 20 }}>
            ¿Buscas un viaje pasado? Está en <Link to="/mi-cuenta/viajes">Mis viajes</Link>.
            Las boletas, en <Link to="/mi-cuenta/comprobantes">Boletas y facturas</Link>.
          </p>
        </>
      )}
    </CuentaLayout>
  );
}
