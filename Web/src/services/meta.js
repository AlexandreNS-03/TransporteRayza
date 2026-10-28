/**
 * Píxel de Meta (Facebook e Instagram).
 *
 * <p>El id es <strong>público</strong>: viaja en el HTML de cada página y lo ve
 * cualquiera que mire el código fuente. No es una clave, así que va acá por
 * defecto igual que el de Google Analytics, y `VITE_META_PIXEL_ID` lo
 * sobreescribe si algún día hay otra cuenta.
 *
 * <p>Solo en el build de producción, y solo después de aceptar las cookies.
 */
const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || "928682004455961";
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

/* El fragmento que da Meta incluye además un <noscript> con una imagen de 1x1.
   Acá no se pone: esta web es una aplicación de React y sin JavaScript no muestra
   absolutamente nada, así que ese respaldo mediría visitas de gente que nunca vio
   la página. */

export function metaEvento(nombre, datos, eventoId) {
  if (!cargado || !window.fbq) return;
  try {
    // Meta nombra los campos distinto que Google: se traduce acá y no en quien
    // llama, para que las pantallas no tengan que saber de ninguna plataforma.
    const contenido = {
      currency: datos.currency,
      value: datos.value,
      content_type: "product",
      contents: (datos.items || []).map((i) => ({
        id: i.item_name, quantity: i.quantity,
      })),
      search_string: datos.search_term,
    };

    // Con eventID, Meta reconoce este aviso y el que manda el servidor como el
    // MISMO hecho y se queda con uno. Sin él contaría dos ventas por cada compra,
    // y con dos campañas midiendo el doble se decide mal dónde poner la plata.
    if (eventoId) window.fbq("track", nombre, contenido, { eventID: eventoId });
    else window.fbq("track", nombre, contenido);
  } catch { /* nunca romper la compra por un píxel */ }
}
