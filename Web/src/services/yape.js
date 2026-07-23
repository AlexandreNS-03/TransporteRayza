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
