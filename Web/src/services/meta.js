/**
 * Píxel de Meta (Facebook e Instagram).
 *
 * <p>Apagado mientras no exista `VITE_META_PIXEL_ID`, igual que el resto de las
 * integraciones del proyecto: una plataforma a medio conectar mide mal, y medir
 * mal es peor que no medir — se toman decisiones de plata con un número falso.
 *
 * <p>Solo en el build de producción, y solo después de aceptar las cookies.
 */
const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || "";
let cargado = false;

export function iniciarMeta() {
  if (cargado || !import.meta.env.PROD || !PIXEL_ID) return;
  cargado = true;

  // Fragmento oficial de Meta, con el id inyectado.
  /* eslint-disable */
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    t = b.createElement(e); t.async = true; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */

  window.fbq("init", PIXEL_ID);
  window.fbq("track", "PageView");
}

export function metaEvento(nombre, datos) {
  if (!cargado || !window.fbq) return;
  try {
    // Meta nombra los campos distinto que Google: se traduce acá y no en quien
    // llama, para que las pantallas no tengan que saber de ninguna plataforma.
    window.fbq("track", nombre, {
      currency: datos.currency,
      value: datos.value,
      content_type: "product",
      contents: (datos.items || []).map((i) => ({
        id: i.item_name, quantity: i.quantity,
      })),
      search_string: datos.search_term,
    });
  } catch { /* nunca romper la compra por un píxel */ }
}
