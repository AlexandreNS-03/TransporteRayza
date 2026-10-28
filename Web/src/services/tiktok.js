/**
 * Píxel de TikTok.
 *
 * <p>Mismas reglas que el de Meta: apagado sin `VITE_TIKTOK_PIXEL_ID`, solo en
 * producción y solo con las cookies aceptadas. Ver meta.js.
 */
const PIXEL_ID = import.meta.env.VITE_TIKTOK_PIXEL_ID || "";
let cargado = false;

export function iniciarTiktok() {
  if (cargado || !import.meta.env.PROD || !PIXEL_ID) return;
  cargado = true;

  /* eslint-disable */
  !function (w, d, t) {
    w.TiktokAnalyticsObject = t;
    var ttq = w[t] = w[t] || [];
    ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off",
                   "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
    ttq.setAndDefer = function (obj, m) {
      obj[m] = function () { obj.push([m].concat([].slice.call(arguments, 0))); };
    };
    for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function (id) {
      var inst = ttq._i[id] || [];
      for (var j = 0; j < ttq.methods.length; j++) ttq.setAndDefer(inst, ttq.methods[j]);
      return inst;
    };
    ttq.load = function (id, opts) {
      var url = "https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._i = ttq._i || {}; ttq._i[id] = []; ttq._i[id]._u = url;
      ttq._t = ttq._t || {}; ttq._t[id] = +new Date();
      ttq._o = ttq._o || {}; ttq._o[id] = opts || {};
      var s = d.createElement("script");
      s.type = "text/javascript"; s.async = true; s.src = url + "?sdkid=" + id + "&lib=" + t;
      var f = d.getElementsByTagName("script")[0];
      f.parentNode.insertBefore(s, f);
    };
    ttq.load(PIXEL_ID);
    ttq.page();
  }(window, document, "ttq");
  /* eslint-enable */
}

export function tiktokEvento(nombre, datos) {
  if (!cargado || !window.ttq) return;
  try {
    window.ttq.track(nombre, {
      currency: datos.currency,
      value: datos.value,
      contents: (datos.items || []).map((i) => ({
        content_name: i.item_name, quantity: i.quantity, price: i.price,
      })),
      query: datos.search_term,
    });
  } catch { /* nunca romper la compra por un píxel */ }
}
