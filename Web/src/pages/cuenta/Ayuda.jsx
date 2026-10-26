import { Link } from "react-router-dom";
import CuentaLayout from "../../components/CuentaLayout";

/**
 * Dónde reclamar y dónde preguntar.
 *
 * El libro de reclamaciones es obligación de INDECOPI y ya existe como página
 * pública; acá se enlaza para que quien tiene un problema no tenga que
 * buscarlo en el pie de página.
 */
export default function Ayuda() {
  return (
    <CuentaLayout titulo="Ayuda">
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>¿Necesitas ayuda con un viaje?</h3>
        <p className="meta">
          Escríbenos por WhatsApp o llámanos a la oficina. Si es sobre un pasaje
          concreto, ten a mano el código del viaje: lo encuentras en{" "}
          <Link to="/mi-cuenta/viajes">Mis viajes</Link>.
        </p>
        <Link className="btn btn-ghost" to="/contacto" style={{ marginTop: 12 }}>
          Ver los datos de contacto
        </Link>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Libro de reclamaciones</h3>
        <p className="meta">
          Si algo salió mal y quieres dejarlo registrado formalmente, este es el camino.
          Tenemos plazo de ley para responderte y la respuesta te llega por correo.
        </p>
        <Link className="btn btn-ghost" to="/libro-de-reclamaciones" style={{ marginTop: 12 }}>
          Abrir el libro de reclamaciones
        </Link>
      </div>
    </CuentaLayout>
  );
}
