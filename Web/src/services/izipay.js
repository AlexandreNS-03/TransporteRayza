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

const SCRIPT_URL = "https://static.micuentaweb.pe/static/js/krypton-client/V4.0/stable/kr-payment-form.min.js";
const CSS_URL    = "https://static.micuentaweb.pe/static/js/krypton-client/V4.0/ext/classic.css";

let cargando = null;

function cargarKrypton(publicKey) {
  if (window.KR) return Promise.resolve(window.KR);
  if (cargando) return cargando;

  cargando = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${CSS_URL}"]`)) {
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

/**
 * Dibuja el formulario dentro de `contenedor` y espera a que el cliente pague.
 *
 * @returns {Promise<{krAnswer: string, krHash: string} | {simulado: true}>}
 */
export async function pagarConIzipay({ formToken, publicKey, simulado, contenedor }) {
  if (simulado) return { simulado: true };

  const KR = await cargarKrypton(publicKey);

  const { KR: kr } = await KR.setFormConfig({
    formToken,
    "kr-public-key": publicKey,
    "kr-language": "es-ES",
  });

  return new Promise((resolve, reject) => {
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
      .catch(() => reject(new Error("No se pudo mostrar el formulario de pago")));
  });
}

/** Quita el formulario al salir del paso de pago, para no dejarlo colgado. */
export function limpiarIzipay(contenedor) {
  const el = typeof contenedor === "string" ? document.querySelector(contenedor) : contenedor;
  if (el) el.innerHTML = "";
}
