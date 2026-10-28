import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import "./Credencial.css";

/**
 * La credencial de pasajero frecuente.
 *
 * <p>Es la cuenta con forma de tarjeta. Sirve para que en el mostrador la
 * persona muestre o dicte un código corto en vez de deletrear su documento —
 * que es lo que hoy demora la cola.
 *
 * <p><strong>El frente es una tarjeta y nada más:</strong> marca, nombre y
 * número. Eso es lo que se mira de reojo para confirmar que la cuenta es la
 * tuya. El QR vive adentro, al ampliarla, porque un QR sirve cuando se puede
 * escanear: a 100 px en una lista no lo lee ningún lector de ventanilla, y
 * ocupando media tarjeta deja de parecer una tarjeta.
 *
 * <p><strong>El documento va tapado</strong>, con los últimos dígitos a la
 * vista, y solo en la vista ampliada. Alcanza para que el propio dueño
 * reconozca que es el suyo, y la tarjeta es justo lo que se muestra en
 * público: no hay motivo para que el número entero quede expuesto sobre un
 * mostrador.
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
  const [abierta, setAbierta] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const cerrarRef = useRef(null);
  const abrirRef = useRef(null);

  const codigo = perfil?.codigoPasajero;

  useEffect(() => {
    if (!codigo) return;
    // Grande desde el principio: la misma imagen se muestra chica en el frente
    // y a tamaño de escanear al ampliarla.
    QRCode.toDataURL(codigo, { width: 560, margin: 0 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [codigo]);

  /* Al ampliar, el foco entra a la tarjeta y el Escape la cierra: si no, quien
     navega con teclado queda atrapado detrás de una tarjeta a pantalla
     completa. Al cerrar, el foco vuelve a donde estaba. */
  useEffect(() => {
    if (!abierta) return;
    cerrarRef.current?.focus();
    const alTeclear = (e) => { if (e.key === "Escape") setAbierta(false); };
    document.addEventListener("keydown", alTeclear);
    const scrollAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = scrollAntes;
    };
  }, [abierta]);

  // Sin código no hay tarjeta: se asigna al entrar a la cuenta, así que esto
  // solo se ve si algo falló del lado del servidor.
  if (!codigo) return null;

  const nombre = [perfil.nombres, perfil.apellidos].filter(Boolean).join(" ").trim();

  // "Distinguido" es tener una categoría que da algo. Quien está en la base no
  // lleva rótulo de categoría: decirle "Socio Rayza" cuando no tiene beneficio
  // es ponerle un nombre a no tener nada.
  const esDistinguido = perfil.descuentoCategoria > 0 && perfil.categoria;

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

  const cara = (grande) => (
    <div className={"credencial-cara" + (grande ? " es-grande" : "")}>
      <div className="credencial-brillo" aria-hidden="true" />
      <div className="credencial-agua" aria-hidden="true" />

      <header className="credencial-top">
        <span className="credencial-marca">
          Transportes <strong>Rayza</strong>
        </span>
        {/* La categoría es el rótulo de la tarjeta. Sin programa de fidelidad
            encendido dice qué es la tarjeta; con él, qué categoría tiene. */}
        <span className={"credencial-tipo" + (esDistinguido ? " es-" + perfil.categoria.toLowerCase() : "")}>
          {esDistinguido ? "Socio " + perfil.categoria : "Pasajero frecuente"}
        </span>
      </header>

      <p className="credencial-codigo">{codigo}</p>

      <footer className="credencial-pie">
        {/* El timón de la empresa, en silueta blanca y a 128 px. No se usa
            /logo-tr.png: pesa 112 KB para verse a 34, y además es azul marino
            sobre blanco, que sobre esta tarjeta no se vería. Decorativo: la
            marca ya está escrita arriba. */}
        <img className="credencial-sello" src="/logo-timon.png" alt="" aria-hidden="true"
             width={128} height={128} loading="lazy" />
        <span className="credencial-quien">
          <strong>{nombre || "Viajero"}</strong>
          <small>
            {esDistinguido
              ? `${perfil.descuentoCategoria}% en cada pasaje`
              : `Socio desde ${perfil.socioDesde || "siempre"}`}
          </small>
        </span>
      </footer>
    </div>
  );

  return (
    <section className="credencial" aria-label="Tu credencial de pasajero">
      <button type="button" className="credencial-abrir" ref={abrirRef}
              onClick={() => setAbierta(true)}
              aria-haspopup="dialog">
        {cara(false)}
      </button>

      <p className="credencial-pista">
        Tócala para ampliarla y mostrar tu código QR
      </p>

      {abierta && (
        <div className="credencial-telon" role="presentation"
             onClick={(e) => { if (e.target === e.currentTarget) setAbierta(false); }}>
          <div className="credencial-hoja" role="dialog" aria-modal="true"
               aria-label={"Tu credencial, " + codigo}>
            <button type="button" className="credencial-cerrar" ref={cerrarRef}
                    onClick={() => setAbierta(false)} aria-label="Cerrar">×</button>

            {cara(true)}

            {qr && (
              <div className="credencial-qr">
                <img src={qr} alt={"Código QR de tu credencial, " + codigo}
                     width={220} height={220} />
              </div>
            )}

            <div className="credencial-datos">
              {perfil.numeroDocumento && (
                <p className="credencial-doc">
                  {perfil.tipoDocumento || "DNI"} {tapado(perfil.numeroDocumento)}
                </p>
              )}
              <button type="button" className="credencial-copiar" onClick={copiar}>
                {copiado ? "Copiado" : "Copiar el código"}
              </button>
            </div>

            {esDistinguido ? (
              <p className="credencial-ayuda">
                Como socio <strong>{perfil.categoria}</strong> pagas{" "}
                {perfil.descuentoCategoria}% menos en cada pasaje, compres en la web
                o en la agencia. Muestra o dicta tu código al comprar.
              </p>
            ) : (
              <p className="credencial-ayuda">
                Muéstralo en la agencia y encontramos tu cuenta sin que tengas que
                deletrear tu documento. También puedes dictarlo.
                {perfil.siguienteCategoria && perfil.viajesParaSiguiente > 0 && (
                  <>
                    {" "}Te faltan <strong>{perfil.viajesParaSiguiente}</strong>{" "}
                    {perfil.viajesParaSiguiente === 1 ? "viaje" : "viajes"} para ser
                    socio {perfil.siguienteCategoria}.
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
