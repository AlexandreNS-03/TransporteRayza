/* Elige el tema ANTES de que React pinte nada.
 *
 * Vive en un archivo y no dentro de index.html por el CSP: un script inline
 * obliga a permitir 'unsafe-inline' en todo el sitio —y entonces el CSP deja de
 * frenar un XSS, que es para lo que está—, o a fijar su hash, que se rompe en
 * silencio con un espacio de más. Un archivo aparte no tiene ninguno de los dos
 * problemas.
 *
 * Va sin defer ni async a propósito: tiene que correr antes del primer pintado
 * o se ve el destello del tema claro antes de pasar al oscuro.
 */
try {
  var t = localStorage.getItem("rayza_tema");
  if (t === "oscuro") document.documentElement.setAttribute("data-tema", "oscuro");
} catch (e) { /* modo privado: queda el tema claro */ }
