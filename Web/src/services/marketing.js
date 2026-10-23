import { iniciarMeta, metaEvento } from "./meta";
import { iniciarTiktok, tiktokEvento } from "./tiktok";

/**
 * Los eventos de negocio, en un solo lugar.
 *
 * <p>Las pantallas llaman a {@link eventos} y no a Google, Meta o TikTok por
 * separado. Así agregar o sacar una plataforma se hace acá y no en ocho
 * archivos, y —más importante— <strong>las tres miden lo mismo</strong>: si
 * cada una se conectara por su lado, dirían números distintos y nadie sabría
 * cuál creer.
 *
 * <p><strong>Nunca se manda un dato personal.</strong> Ni correo, ni documento,
 * ni nombre, ni teléfono, ni siquiera en forma de hash. Lo que viaja es qué
 * ruta, cuánto y cuántos pasajes. El "emparejamiento avanzado" que ofrecen Meta
 * y TikTok mejora un poco la atribución a cambio de mandarles la identidad de
 * cada comprador: es una decisión de privacidad, no una casilla técnica, y
 * hasta que alguien la tome de forma explícita la respuesta es no.
 *
 * <p>Todo esto solo corre si el visitante aceptó las cookies: lo enciende
 * {@link ./analitica}, que a su vez lo llama el banner.
 */

/** Las tres plataformas, en el orden en que se avisan. */
function aTodos(nombreGA, nombreMeta, nombreTiktok, datos) {
  try { window.gtag?.("event", nombreGA, datos); } catch { /* nunca romper la compra */ }
  if (nombreMeta) metaEvento(nombreMeta, datos);
  if (nombreTiktok) tiktokEvento(nombreTiktok, datos);
}

/**
 * Las compras que ya se avisaron.
 *
 * <p>Sin esto, volver atrás o un re-render de React vuelven a disparar la
 * compra y el panel muestra el doble de ventas de las que hubo. Con plata de
 * por medio, un número inflado es peor que no tener número.
 */
const yaAvisadas = new Set();

/** La página en la que empezó la visita, que los cargadores ya avisaron solos. */
let primeraPagina = window.location.pathname;

export const eventos = {
  /**
   * Cambió de página.
   *
   * <p>Esta web es una sola página de React: al pasar de "/" a "/comprar" el
   * navegador no recarga nada, así que los cargadores avisan UNA vez y después
   * nunca más. Sin esto, Meta cree que todo el mundo vio solo la primera
   * pantalla, y la audiencia de "entró a comprar y no compró" —que es la que
   * hace que valga la pena pagar publicidad— queda vacía.
   *
   * <p>La primera página no se vuelve a avisar: ya la avisó el cargador al
   * arrancar, y contarla dos veces infla todo lo que se mida por visita.
   */
  vioPagina(ruta) {
    if (ruta === primeraPagina) { primeraPagina = null; return; }
    primeraPagina = null;
    try { window.gtag?.("event", "page_view", { page_path: ruta }); } catch { /* vacío */ }
    if (window.fbq) { try { window.fbq("track", "PageView"); } catch { /* vacío */ } }
    if (window.ttq) { try { window.ttq.page(); } catch { /* vacío */ } }
  },

  /** Buscó viajes. Dice qué rutas pide la gente, incluso las que no vendemos. */
  busco({ origen, destino, fecha }) {
    aTodos("search", "Search", "Search", {
      search_term: `${origen} → ${destino}`,
      fecha,
    });
  },

  /** Eligió asiento y entró al pago. Con esto y la compra se sabe cuántos se caen en el pago. */
  empezoElPago({ total, pasajes, ruta }) {
    aTodos("begin_checkout", "InitiateCheckout", "InitiateCheckout", {
      currency: "PEN",
      value: Number(total) || 0,
      num_items: pasajes,
      items: [{ item_name: ruta, quantity: pasajes }],
    });
  },

  /**
   * Pagó.
   *
   * <p>Es el único evento que de verdad importa: sin él, una campaña no sabe a
   * quién parecerse para traer más compradores, y no hay forma de saber cuánto
   * cuesta una venta.
   */
  compro({ id, total, pasajes, ruta }) {
    if (!id || yaAvisadas.has(id)) return;
    yaAvisadas.add(id);

    aTodos("purchase", "Purchase", "CompletePayment", {
      transaction_id: id,
      currency: "PEN",
      value: Number(total) || 0,
      items: [{ item_name: ruta, quantity: pasajes, price: redondear(total, pasajes) }],
    });
  },
};

function redondear(total, pasajes) {
  const n = Number(pasajes) || 1;
  return Math.round(((Number(total) || 0) / n) * 100) / 100;
}

/** La llama el consentimiento, no el arranque. Ver analitica.js. */
export function iniciarPixeles() {
  iniciarMeta();
  iniciarTiktok();
}
