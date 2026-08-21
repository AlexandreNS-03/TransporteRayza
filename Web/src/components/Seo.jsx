import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { EMPRESA } from "../datos";
import { DESTINOS } from "../destinos";

/**
 * Título, descripción y canonical según la página que se está viendo.
 *
 * Sin esto, todas las direcciones compartían el mismo título ("Pasajes Requena a
 * Iquitos"), así que en Google la página de contacto y la de rastreo aparecían
 * anunciando otra cosa.
 *
 * El canonical se pone acá y NO en index.html a propósito: al ser una sola
 * página que cambia por dentro, un canonical fijo en el HTML diría que todas
 * las direcciones son copias del inicio, que es peor que no tener ninguno.
 * También deja fuera los parámetros de búsqueda, así /comprar?origen=…&fecha=…
 * no se cuenta como una página distinta por cada combinación.
 */

const PORTADA = {
  titulo: `${EMPRESA.nombreCorto} — Pasajes en lancha rápida por la Amazonía`,
  descripcion: "Compra tu pasaje en línea entre Requena, Iquitos, Nauta y los puertos del río. Eliges tu asiento, pagas con tarjeta o Yape y recibes tu boleto con QR al instante.",
};

const PAGINAS = {
  "/comprar": {
    titulo: `Comprar pasaje en línea — ${EMPRESA.nombreCorto}`,
    descripcion: "Busca tu viaje, elige tu asiento en el mapa del bote y paga con tarjeta o Yape. Tu boleto con QR llega al correo.",
  },
  "/destinos": {
    titulo: `Destinos — ${EMPRESA.nombreCorto}`,
    descripcion: "Los puertos a los que llegamos por el río: Iquitos, Requena, Nauta y Jenaro Herrera.",
  },
  "/servicios": {
    titulo: `Servicios — ${EMPRESA.nombreCorto}`,
    descripcion: "Transporte de pasajeros y envío de encomiendas por los ríos de Loreto.",
  },
  "/rastreo": {
    titulo: `Rastrear una encomienda — ${EMPRESA.nombreCorto}`,
    descripcion: "Consulta dónde está tu envío con el código o el documento del remitente.",
  },
  "/paga-tu-carga": {
    titulo: `Pagar una encomienda — ${EMPRESA.nombreCorto}`,
    descripcion: "Paga en línea el envío de tu carga con tarjeta o Yape.",
  },
  "/contacto": {
    titulo: `Contacto — ${EMPRESA.nombreCorto}`,
    descripcion: `Escríbenos o llámanos al ${EMPRESA.telefono}. Oficinas en Requena e Iquitos.`,
  },
  "/clausulas": {
    titulo: `Términos y condiciones — ${EMPRESA.nombreCorto}`,
    descripcion: "Condiciones del servicio de transporte fluvial de pasajeros y encomiendas.",
  },
  "/privacidad": {
    titulo: `Política de privacidad — ${EMPRESA.nombreCorto}`,
    descripcion: "Cómo tratamos los datos que nos dejas al comprar o consultar un envío.",
  },
};

/** Crea la etiqueta si falta y le pone el valor; así no hay que tocar index.html. */
function fijarMeta(selector, crear, valor) {
  let el = document.head.querySelector(selector);
  if (!el) { el = crear(); document.head.appendChild(el); }
  if (el.tagName === "LINK") el.setAttribute("href", valor);
  else el.setAttribute("content", valor);
}

export default function Seo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const limpio = pathname !== "/" && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

    let meta = PAGINAS[limpio];
    if (!meta && limpio.startsWith("/destinos/")) {
      const destino = DESTINOS.find((d) => d.slug === limpio.slice("/destinos/".length));
      if (destino) {
        meta = {
          titulo: `Viajar a ${destino.nombre} — ${EMPRESA.nombreCorto}`,
          descripcion: destino.intro || destino.descripcion,
        };
      }
    }
    if (!meta) meta = PORTADA;   // incluye el inicio y cualquier ruta desconocida

    document.title = meta.titulo;
    fijarMeta('meta[name="description"]',
      () => Object.assign(document.createElement("meta"), { name: "description" }), meta.descripcion);

    const url = EMPRESA.sitio + (limpio === "/" ? "/" : limpio);
    fijarMeta('link[rel="canonical"]',
      () => Object.assign(document.createElement("link"), { rel: "canonical" }), url);

    // og:url y og:title también se actualizan para quien sí ejecuta JavaScript.
    // WhatsApp y Facebook no lo hacen: ellos se quedan con lo que está escrito
    // en index.html, que por eso lleva la tarjeta general del sitio.
    fijarMeta('meta[property="og:url"]',
      () => { const m = document.createElement("meta"); m.setAttribute("property", "og:url"); return m; }, url);
    fijarMeta('meta[property="og:title"]',
      () => { const m = document.createElement("meta"); m.setAttribute("property", "og:title"); return m; }, meta.titulo);
    fijarMeta('meta[property="og:description"]',
      () => { const m = document.createElement("meta"); m.setAttribute("property", "og:description"); return m; }, meta.descripcion);
  }, [pathname]);

  return null;
}
