import { useEffect, useState } from "react";
import QRCode from "qrcode";
import "./Credencial.css";

/**
 * La credencial de pasajero frecuente.
 *
 * <p>Es la cuenta con forma de tarjeta: el nombre, el código y el QR. Sirve
 * para que en el mostrador la persona muestre o dicte un código corto en vez de
 * deletrear su documento — que es lo que hoy demora la cola.
 *
 * <p><strong>El documento va tapado</strong>, con los últimos dígitos a la
 * vista. Alcanza para que el propio dueño reconozca que es el suyo, y una
 * tarjeta es justo lo que se muestra en público: no hay motivo para que el
 * número entero quede expuesto sobre un mostrador.
 *
 * <p>El QR lleva el código y nada más. Ni el documento, ni el correo, ni el
 * nombre: lo que entra en un QR se queda en la foto que le saque cualquiera.
 */

function tapado(numero) {
  if (!numero) return null;
  const s = String(numero).trim();
  if (s.length <= 4) return s;
  return "•".repeat(Math.max(2, s.length - 4)) + s.slice(-4);
}

export default function Credencial({ perfil }) {
  const [qr, setQr] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const codigo = perfil?.codigoPasajero;

  useEffect(() => {
    if (!codigo) return;
    QRCode.toDataURL(codigo, { width: 300, margin: 0 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [codigo]);

  // Sin código no hay tarjeta: se asigna al entrar a la cuenta, así que esto
  // solo se ve si algo falló del lado del servidor.
  if (!codigo) return null;

  const nombre = [perfil.nombres, perfil.apellidos].filter(Boolean).join(" ").trim();

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles el código igual está a la vista y se puede
      // seleccionar: no hace falta avisar de nada.
    }
  };

  return (
    <section className="credencial" aria-label="Tu credencial de pasajero">
      <div className="credencial-cara">
        <div className="credencial-datos">
          <span className="credencial-marca">Transportes Rayza</span>
          <p className="credencial-nombre">{nombre || "Viajero"}</p>

          <span className="credencial-eti">Código de pasajero</span>
          <p className="credencial-codigo">{codigo}</p>

          {perfil.numeroDocumento && (
            <p className="credencial-doc">
              {perfil.tipoDocumento || "DNI"} {tapado(perfil.numeroDocumento)}
            </p>
          )}

          <button type="button" className="credencial-copiar" onClick={copiar}>
            {copiado ? "Copiado" : "Copiar el código"}
          </button>
        </div>

        {qr && (
          <div className="credencial-qr">
            <img src={qr} alt={"Código QR de tu credencial, " + codigo} width={108} height={108} />
          </div>
        )}
      </div>

      <p className="credencial-ayuda">
        Dale este código en la agencia y encontramos tu cuenta sin que tengas que
        deletrear tu documento.
      </p>
    </section>
  );
}
