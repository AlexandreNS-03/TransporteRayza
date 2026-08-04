import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Al cambiar de página, React Router conserva la posición del scroll: si venías
 * del pie de página, la página nueva se abría "a la mitad". Esto lo corrige:
 *
 *  - Con ancla (#destinos, #nosotros): baja hasta esa sección.
 *  - Sin ancla: sube al inicio de la página.
 */
export default function IrArriba() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // La sección puede tardar en montarse y, sobre todo, el contenido de
      // arriba (imágenes del carrusel) se acomoda después y desplaza el punto.
      // Por eso se reintenta hasta que la sección quede realmente arriba.
      let intentos = 0;
      let cancelado = false;
      const ir = () => {
        if (cancelado) return;
        const el = document.querySelector(hash);
        if (el) {
          const dif = el.getBoundingClientRect().top;
          if (Math.abs(dif) > 8) {
            el.scrollIntoView({ behavior: intentos === 0 ? "smooth" : "auto", block: "start" });
          } else {
            return; // ya quedó alineada
          }
        }
        if (++intentos < 5) setTimeout(ir, 350);
      };
      ir();
      return () => { cancelado = true; };
    }
    // "instant" a propósito: el sitio tiene scroll-behavior: smooth y, al cambiar
    // de página, animar el recorrido completo se ve como si la página "cayera".
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);

  return null;
}
