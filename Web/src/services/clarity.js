/**
 * Microsoft Clarity: mapas de calor y grabación de sesiones (analítica de uso).
 *
 * Carga solo en el build de producción y una única vez. El Project ID es público
 * (va en la página); por defecto usa el de la cuenta, y se puede sobreescribir con
 * VITE_CLARITY_ID. La llamada la dispara el consentimiento de cookies, no el arranque.
 */
const CLARITY_ID = import.meta.env.VITE_CLARITY_ID || "xv96l7rhvn";
let cargado = false;

export function iniciarClarity() {
  if (cargado || !import.meta.env.PROD || !CLARITY_ID) return;
  cargado = true;

  // Fragmento oficial de Clarity, con el ID inyectado.
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", CLARITY_ID);
}
