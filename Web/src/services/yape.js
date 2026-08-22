/**
 * Pago con Yape a través de Mercado Pago.
 *
 * El cliente escribe su celular y el código de aprobación de 6 dígitos que le da la
 * app de Yape. El SDK de Mercado Pago los convierte en un token de un solo uso, y ese
 * token —no el código— es lo único que sale del navegador: ni el celular ni el código
 * pasan por nuestro servidor.
 *
 * Sin clave pública configurada se trabaja en modo simulación, igual que la tarjeta.
 */

const SDK_URL = "https://sdk.mercadopago.com/js/v2";

let cargando = null;

function cargarSdk() {
  if (window.MercadoPago) return Promise.resolve();
  if (cargando) return cargando;

  cargando = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.onload = () => (window.MercadoPago ? resolve() : reject(new Error("Yape no se inicializó")));
    s.onerror = () => { cargando = null; reject(new Error("No se pudo cargar Yape")); };
    document.head.appendChild(s);
  });
  return cargando;
}

/**
 * Genera el token de Yape.
 *
 * @param otp          código de aprobación de 6 dígitos de la app de Yape
 * @param phoneNumber  celular del pagador (9 dígitos)
 * @returns el token, o null si está en modo simulación
 */
export async function tokenizarYape({ publicKey, simulado, otp, phoneNumber }) {
  if (simulado) return null;

  if (!/^\d{9}$/.test(phoneNumber || ""))
    throw new Error("El número de celular debe tener 9 dígitos");
  if (!/^\d{6}$/.test(otp || ""))
    throw new Error("El código de aprobación debe tener 6 dígitos");

  await cargarSdk();

  const mp = new window.MercadoPago(publicKey);
  const yape = mp.yape({ otp, phoneNumber });

  try {
    const token = await yape.create();
    // El SDK devuelve el id del token, a veces envuelto en un objeto
    return typeof token === "string" ? token : (token?.id ?? token?.token);
  } catch (e) {
    // Los errores del SDK vienen como lista de causas
    const detalle = Array.isArray(e) ? e[0]?.message : e?.message;
    throw new Error(detalle || "No se pudo validar el código de Yape");
  }
}

// ---------------------------------------------------------------------------
// Huella del dispositivo
// ---------------------------------------------------------------------------

/**
 * Mercado Pago rechazaba pagos legítimos con "no pasó los controles de seguridad".
 * Su motor antifraude necesita identificar el dispositivo desde el que se compra:
 * este script calcula una huella del navegador y la deja en una variable global,
 * que el servidor reenvía en la cabecera X-meli-session-id al crear el pago.
 *
 * No manda datos del cliente ni de la compra: solo características del navegador.
 */
const SEGURIDAD_URL = "https://www.mercadopago.com/v2/security.js";

let huella = null;

function cargarSeguridad() {
  if (huella) return huella;

  huella = intentarCargar().then((valor) => {
    // Si no se pudo calcular, se olvida el intento para que el siguiente pago
    // vuelva a probar. Guardar el fallo dejaba a toda la sesión sin huella —y
    // por lo tanto con más riesgo de rechazo— por un tropiezo de red al abrir.
    if (!valor) huella = null;
    return valor;
  });

  return huella;
}

function intentarCargar() {
  return new Promise((resolve) => {
    if (window.MP_DEVICE_SESSION_ID) return resolve(window.MP_DEVICE_SESSION_ID);

    const s = document.createElement("script");
    s.src = SEGURIDAD_URL;
    s.setAttribute("view", "checkout");
    // El script tarda un momento en calcular la huella después de cargar, así que
    // se revisa por unos segundos. Si no aparece se paga igual: no vale la pena
    // trabar una compra por esto, solo baja la probabilidad de aprobación.
    s.onload = () => {
      const limite = Date.now() + 3000;
      const revisar = () => {
        if (window.MP_DEVICE_SESSION_ID) return resolve(window.MP_DEVICE_SESSION_ID);
        if (Date.now() > limite) return resolve(null);
        setTimeout(revisar, 100);
      };
      revisar();
    };
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

/**
 * Empieza a calcular la huella sin esperarla. Se llama al abrir una pantalla de
 * pago —no en toda la web— para que ya esté lista cuando el cliente termine de
 * escribir su código y no haya que hacerlo esperar.
 */
export function prepararHuellaDispositivo() {
  cargarSeguridad();
}

/** Devuelve la huella del dispositivo, o null si no se pudo calcular. */
export function huellaDispositivo() {
  return cargarSeguridad();
}
