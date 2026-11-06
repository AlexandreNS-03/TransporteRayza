/**
 * Pasarela Izipay — formulario embebido (Krypton V4).
 *
 * Los datos de la tarjeta se escriben dentro del formulario de Izipay y nunca pasan
 * por nuestro código ni por nuestro servidor: acá solo se maneja el formToken que el
 * backend pidió a Izipay, y la respuesta firmada que devuelve al terminar.
 *
 * Cuando el backend responde `simulado: true` (sin credenciales configuradas) no se
 * carga nada y se resuelve de inmediato, para poder probar el resto de la compra.
 */

const BASE       = "https://static.micuentaweb.pe/static/js/krypton-client/V4.0";
const SCRIPT_URL = `${BASE}/stable/kr-payment-form.min.js`;

/*
 * El tema del formulario: `classic`, el que Izipay trae por defecto.
 *
 * Va la versión MINIFICADA. Es el mismo tema —mismas reglas, mismo resultado en
 * pantalla— pero pesa 89 KB comprimidos en vez de 412. Antes acá estaba
 * `classic.css`, que es el archivo sin minificar: 5 MB en crudo. En Iquitos con
 * datos del celular esos 320 KB de más se bajan justo cuando la persona ya puso
 * la tarjeta y está esperando.
 *
 * Izipay publica además un `classic.js`, y su documentación dice que hay que
 * cargarlo antes que la biblioteca principal porque lleva "la parte activa del
 * tema". NO SE CARGA, y es a propósito: probado contra su tienda de prueba, ese
 * archivo hace que la biblioteca le escriba al botón de pagar un
 * `color: #115551` en el atributo style. Sobre el turquesa de Izipay eso ya es
 * texto apagado sobre fondo claro; con el color de Rayza encima queda azul
 * oscuro sobre azul oscuro, ilegible. Como es un style en línea, no se puede
 * corregir desde nuestro CSS sin un !important sobre las tripas de Izipay, que
 * es justo lo que no se hace acá. Sin ese archivo el botón sale con el texto
 * blanco que trae la hoja de estilos, y se lee.
 *
 * Si algún día Izipay lo arregla, esto se vuelve a mirar. Se comprueba así:
 * cargar el tema JS y leer el `style` del `.kr-payment-button`.
 */
const CSS_URL = `${BASE}/ext/classic.min.css`;

let cargando = null;

/**
 * Deja la pasarela lista antes de que haga falta.
 *
 * El formulario son ~750 KB comprimidos (la biblioteca sola pesa 658). Si se
 * empiezan a bajar recién al tocar "Pagar", la persona se queda mirando un
 * hueco con la tarjeta en la mano. Llamando a esto cuando elige pagar con
 * tarjeta —que es varios segundos antes— llegan en frío y el formulario aparece
 * al toque.
 *
 * Usa `preload` y no un <script>: deja los archivos en la caché sin ejecutarlos,
 * así que no cambia en nada cuándo ni cómo se inicializa Izipay. Si la persona
 * termina pagando con Yape o con saldo, lo único que se perdió es la descarga.
 */
export function precargarIzipay() {
  for (const [href, as] of [[CSS_URL, "style"], [SCRIPT_URL, "script"]]) {
    if (document.querySelector(`link[rel="preload"][href="${href}"]`)) continue;
    const l = document.createElement("link");
    l.rel = "preload";
    l.as = as;
    l.href = href;
    document.head.appendChild(l);
  }
}

function cargarKrypton(publicKey) {
  if (window.KR) return Promise.resolve(window.KR);
  if (cargando) return cargando;

  cargando = new Promise((resolve, reject) => {
    // `rel="stylesheet"` tiene que ir en el selector: precargarIzipay() deja un
    // <link rel="preload"> con ESTE mismo href, y sin esa parte lo encontraría
    // acá y daría por puesta una hoja de estilos que nunca se aplicó — el
    // formulario saldría sin tema.
    if (!document.querySelector(`link[rel="stylesheet"][href="${CSS_URL}"]`)) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = CSS_URL;
      document.head.appendChild(css);
    }

    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.setAttribute("kr-public-key", publicKey);
    s.setAttribute("kr-language", "es-ES");
    s.onload = () => (window.KR ? resolve(window.KR) : reject(new Error("Izipay no se inicializó")));
    s.onerror = () => { cargando = null; reject(new Error("No se pudo cargar la pasarela de pago")); };
    document.head.appendChild(s);
  });
  return cargando;
}

/** Error con el que se corta el pago cuando la persona decide no seguir. */
export class PagoCancelado extends Error {
  constructor() { super("Pago cancelado"); this.cancelado = true; }
}

/**
 * Dibuja el formulario dentro de `contenedor` y espera a que el cliente pague.
 * `registrarCancelacion` recibe una función para abortar desde fuera: sin ella
 * la promesa queda colgada si la persona se arrepiente.
 *
 * @returns {Promise<{krAnswer: string, krHash: string} | {simulado: true}>}
 */
export async function pagarConIzipay({ formToken, publicKey, simulado, contenedor,
                                       alMostrarFormulario, registrarCancelacion }) {
  if (simulado) return { simulado: true };

  const KR = await cargarKrypton(publicKey);

  const { KR: kr } = await KR.setFormConfig({
    formToken,
    "kr-public-key": publicKey,
    "kr-language": "es-ES",
  });

  return new Promise((resolve, reject) => {
    // El formulario de Izipay solo avisa si cobró, si lo rechazaron o si falló:
    // no avisa cuando la persona se arrepiente. Sin esta salida, la promesa se
    // quedaba colgada para siempre y la página seguía creyendo que el pago
    // estaba en curso, dejando el botón de volver deshabilitado.
    registrarCancelacion?.(() => reject(new PagoCancelado()));

    // onSubmit corre cuando Izipay ya cobró; devuelve la respuesta firmada que el
    // servidor tiene que verificar antes de dar la venta por buena.
    kr.onSubmit((respuesta) => {
      const krAnswer = respuesta.clientAnswer
        ? JSON.stringify(respuesta.clientAnswer)
        : respuesta.rawClientAnswer;

      if (respuesta.clientAnswer?.orderStatus !== "PAID") {
        reject(new Error("El pago no se completó. Puedes intentar de nuevo."));
        return false;
      }
      resolve({ krAnswer, krHash: respuesta.hash });
      return false;   // evita que Izipay redirija: la confirmación la damos nosotros
    });

    kr.onError((error) => {
      reject(new Error(error?.errorMessage || "El pago fue rechazado"));
    });

    kr.attachForm(contenedor)
      .then(({ KR: k, result }) => k.showForm(result.formId))
      // Izipay ya tiene su propio botón de pagar: se avisa para que la página
      // esconda el suyo y no queden dos botones a la vez.
      .then(() => alMostrarFormulario?.())
      .catch(() => reject(new Error("No se pudo mostrar el formulario de pago")));
  });
}

/** Quita el formulario al salir del paso de pago, para no dejarlo colgado. */
export function limpiarIzipay(contenedor) {
  const el = typeof contenedor === "string" ? document.querySelector(contenedor) : contenedor;
  if (el) el.innerHTML = "";
}
