import { useState } from "react";
import { Link } from "react-router-dom";
import { consentActual, guardarConsent } from "../services/consent";
import { iniciarAnalitica } from "../services/analitica";

/**
 * Aviso de cookies. Se muestra hasta que el visitante decide. La analítica (GA y
 * Clarity) solo se enciende si acepta; si rechaza, no se carga nada.
 */
export default function CookieBanner() {
  const [visible, setVisible] = useState(() => !consentActual());
  if (!visible) return null;

  const decidir = (valor) => {
    guardarConsent(valor);
    if (valor === "accepted") iniciarAnalitica();
    setVisible(false);
  };

  return (
    <div className="cookie-banner" role="dialog" aria-label="Aviso de cookies">
      <p>
        Usamos cookies para analizar el uso del sitio y mejorar tu experiencia.
        Puedes aceptarlas o seguir sin ellas. Más info en nuestras{" "}
        <Link to="/clausulas">condiciones</Link>.
      </p>
      <div className="cookie-acciones">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => decidir("rejected")}>
          Rechazar
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => decidir("accepted")}>
          Aceptar
        </button>
      </div>
    </div>
  );
}
