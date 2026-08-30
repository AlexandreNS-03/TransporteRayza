import { useEffect, useState } from "react";
import { getAnuncios } from "../services/publicApi";

// Mensaje de respaldo si no hay ningún anuncio de tipo BARRA cargado (o si la
// petición falla): la barra nunca queda vacía sin explicación.
// Corto a propósito: la barra tiene alto fijo —para que cambiar el anuncio no
// mueva la página— y a este largo entra completo hasta en el celular más
// angosto, sin que se corte a media frase.
const RESPALDO = {
  mensaje: "Compra 100% en línea: elige tu asiento, paga con Yape o tarjeta y recibe tu boleto con QR.",
};

// Barra de anuncios superior, descartable (estilo aerolínea).
export default function AnnouncementBar() {
  const [anuncio, setAnuncio] = useState(RESPALDO);
  const [visible, setVisible] = useState(
    () => sessionStorage.getItem("rayza_announce_off") !== "1"
  );

  useEffect(() => {
    getAnuncios("BARRA").then((lista) => {
      if (lista.length > 0) setAnuncio(lista[0]);
    });
  }, []);

  if (!visible) return null;

  const cerrar = () => {
    sessionStorage.setItem("rayza_announce_off", "1");
    setVisible(false);
  };

  return (
    <div className="announce">
      <div className="wrap">
        <span className="dot" />
        <p>
          {anuncio.titulo && <b>{anuncio.titulo}: </b>}
          {anuncio.mensaje}
          {anuncio.urlEnlace && (
            <a className="announce-enlace" href={anuncio.urlEnlace}>{anuncio.textoEnlace || "Ver más"}</a>
          )}
        </p>
        <button onClick={cerrar} aria-label="Cerrar aviso">×</button>
      </div>
    </div>
  );
}
