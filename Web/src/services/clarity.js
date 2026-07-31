/**
 * Microsoft Clarity: mapas de calor y grabación de sesiones (analítica de uso).
 *
 * Se carga SOLO si hay un ID configurado en VITE_CLARITY_ID. Así no corre en
 * desarrollo, no queda hardcodeado y se puede apagar sin tocar código. El ID de
 * Clarity es público (viaja en la página), no es un secreto.
 *
 * Para activarlo: crea un proyecto en https://clarity.microsoft.com, copia el
 * "Project ID" y ponlo en VITE_CLARITY_ID al compilar (ver .env.example).
 */
export function iniciarClarity() {
  const id = import.meta.env.VITE_CLARITY_ID;
  if (!id) return;

  // Fragmento oficial de Clarity, con el ID inyectado desde la variable de entorno.
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", id);
}
