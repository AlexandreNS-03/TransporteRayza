import { useEffect, useState } from "react";
import { getAnuncios } from "../services/publicApi";

/**
 * Ventana emergente con el primer anuncio activo de tipo MODAL. Se muestra una
 * vez por sesión de navegador (por anuncio: si cambia el anuncio, se vuelve a
 * mostrar aunque ya se haya cerrado uno anterior).
 */
export default function AnuncioModal() {
  const [anuncio, setAnuncio] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    getAnuncios("MODAL").then((lista) => {
      const a = lista[0];
      if (!a) return;
      if (sessionStorage.getItem(`rayza_modal_off_${a.id}`)) return;
      setAnuncio(a);
      setVisible(true);
    });
  }, []);

  const cerrar = () => {
    if (anuncio) sessionStorage.setItem(`rayza_modal_off_${anuncio.id}`, "1");
    setVisible(false);
  };

  if (!visible || !anuncio) return null;

  return (
    <div className="anuncio-modal-overlay" onClick={cerrar}>
      <div className="anuncio-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="anuncio-modal-cerrar" onClick={cerrar} aria-label="Cerrar">×</button>
        <h3>{anuncio.titulo}</h3>
        <p>{anuncio.mensaje}</p>
        {anuncio.urlEnlace && (
          <a className="btn btn-primary" href={anuncio.urlEnlace} onClick={cerrar}>
            {anuncio.textoEnlace || "Ver más"}
          </a>
        )}
      </div>
    </div>
  );
}
