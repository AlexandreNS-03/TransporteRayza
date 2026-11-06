#!/usr/bin/env node
/**
 * ¿Nuestra tienda de Izipay puede guardar tarjetas y cobrar sin el cliente?
 *
 * Es la pregunta de la que depende si seguimos con el Yape on file de GMoney al
 * 3,776 %. La documentación de Izipay dice que para el "pago 0 clic (MIT)" el
 * único requisito de la API es tener un token... pero en la tabla de casos de
 * uso de Charge/CreatePayment agrega, en letra chica, que ese caso **requiere la
 * opción "API REST de pago en modo campos incrustados"**. O sea que hay dos
 * puertas, y las dos se abren del lado de ellos, no del nuestro. Preguntar por
 * correo toma días; esto lo contesta en cinco segundos.
 *
 * Hace TRES llamadas y no cobra nada:
 *
 *   1. ¿Las credenciales entran?            Charge/CreatePayment normal
 *   2. ¿Podemos crear tokens (alias)?       Charge/CreateToken
 *   3. ¿Tenemos 0 clic (MIT)?               CreatePayment con transactionInitiator
 *
 * Las tres devuelven un formToken o un error; ninguna mueve plata. La tercera va
 * con un token inventado a propósito: si la cuenta NO tiene la opción, Izipay se
 * queja de la opción; si la tiene, se queja de que ese token no existe. Esa
 * diferencia es toda la respuesta.
 *
 * Uso:
 *
 *   IZIPAY_USERNAME=... IZIPAY_PASSWORD=... node Backend/scripts/probar-tokens-izipay.mjs
 *
 * Por defecto SOLO corre con credenciales de prueba (las que traen
 * `testpassword_`). Para correrlo contra producción hay que escribir --produccion
 * a mano: contra la tienda real, la llamada 2 deja un formulario de registro
 * abierto en el histórico de Izipay, y eso ensucia la conciliación.
 *
 * No imprime nunca el usuario ni la contraseña.
 */

const USUARIO  = process.env.IZIPAY_USERNAME ?? "";
const CLAVE    = process.env.IZIPAY_PASSWORD ?? "";
const ENDPOINT = process.env.IZIPAY_ENDPOINT ?? "https://api.micuentaweb.pe";
const PRODUCCION = process.argv.includes("--produccion");

if (!USUARIO || !CLAVE) {
  console.error("Faltan IZIPAY_USERNAME y/o IZIPAY_PASSWORD en el entorno.");
  console.error("Se sacan de Railway (Variables del servicio del backend).");
  process.exit(2);
}

// Izipay no tiene dos direcciones: la misma API distingue prueba de producción
// por la credencial. Por eso el único freno posible es mirar la contraseña.
const esPrueba = CLAVE.startsWith("testpassword_");
if (!esPrueba && !PRODUCCION) {
  console.error("Esa contraseña no es de prueba y no se pasó --produccion.");
  console.error("Usá las credenciales de TEST, o escribí --produccion a propósito.");
  process.exit(2);
}

const AUTORIZACION = "Basic " + Buffer.from(`${USUARIO}:${CLAVE}`).toString("base64");

/** Una llamada a la API. Devuelve el cuerpo ya interpretado, pase lo que pase. */
async function llamar(servicio, cuerpo) {
  const r = await fetch(`${ENDPOINT}/api-payment/V4/${servicio}`, {
    method: "POST",
    headers: { Authorization: AUTORIZACION, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  try { return { http: r.status, ...JSON.parse(texto) }; }
  catch { return { http: r.status, status: "ERROR", answer: { errorMessage: texto.slice(0, 300) } }; }
}

/** Lo imprime en dos líneas: el veredicto y, si falló, qué dijo Izipay. */
function contar(titulo, r) {
  const ok = r.status === "SUCCESS";
  console.log(`\n${ok ? "✓" : "✗"}  ${titulo}`);
  if (ok) {
    const t = r.answer?.formToken;
    console.log(`   SUCCESS${t ? ` — devolvió un formToken de ${t.length} caracteres` : ""}`);
  } else {
    const a = r.answer ?? {};
    console.log(`   HTTP ${r.http} · ${a.errorCode ?? "sin código"} — ${a.errorMessage ?? "sin mensaje"}`);
    if (a.detailedErrorCode || a.detailedErrorMessage)
      console.log(`   detalle: ${a.detailedErrorCode ?? ""} ${a.detailedErrorMessage ?? ""}`.trimEnd());
  }
  return ok;
}

const base = { currency: "PEN", orderId: "prueba-tokens-" + Date.now() };

console.log(`Tienda ${USUARIO.replace(/.(?=.{3})/g, "•")} · ${ENDPOINT} · ` +
            (esPrueba ? "credenciales de PRUEBA" : "credenciales de PRODUCCIÓN"));

// 1 ─ ¿Entramos? Si esto falla, lo demás no dice nada: el problema son las claves.
const uno = contar(
  "Las credenciales entran (Charge/CreatePayment)",
  await llamar("Charge/CreatePayment", { ...base, amount: 180 }));

if (!uno) {
  console.log("\nSin esto no tiene sentido seguir: revisá usuario y contraseña.");
  process.exit(1);
}

// 2 ─ Tarjetas guardadas. Charge/CreateToken crea un alias SIN pago; devuelve un
//     formToken porque el número de tarjeta lo escribe el cliente en el
//     formulario de ellos, nunca pasa por nosotros.
const dos = contar(
  "Podemos crear tokens / tarjetas guardadas (Charge/CreateToken)",
  await llamar("Charge/CreateToken", base));

// 3 ─ Cobro sin el cliente. El token es inventado a propósito.
const tres = await llamar("Charge/CreatePayment", {
  ...base,
  amount: 180,
  paymentMethodToken: "00000000000000000000000000000000",
  formAction: "PAYMENT",
  transactionInitiator: "MERCHANT",
});
const tresOk = contar("Tenemos cobro 0 clic / MIT (transactionInitiator: MERCHANT)", tres);

console.log("\n" + "─".repeat(68));
console.log("CÓMO SE LEE");
console.log("─".repeat(68));
console.log(dos
  ? "• Tarjetas guardadas: SÍ. La opción de alias está activa; lo que falta es\n" +
    "  nuestro lado (el flujo a medio construir), no la cuenta."
  : "• Tarjetas guardadas: NO, o no todavía. El error de arriba dice por qué.\n" +
    "  Si habla de una opción, es activación de Izipay, no código nuestro.");

if (tresOk) {
  console.log("• 0 clic (MIT): aceptó un token inventado. Raro — mirar la respuesta a mano.");
} else {
  // PSP_030 ("payment token not found") es la respuesta buena: significa que
  // Izipay aceptó la operación y lo único que le faltó fue el token, que le
  // mandamos inventado. Es exactamente lo que devuelve la tienda de prueba que
  // ellos publican en su documentación, que sí tiene la opción activa — ese fue
  // el patrón de referencia con el que se escribió este script.
  const m = `${tres.answer?.errorMessage ?? ""} ${tres.answer?.detailedErrorMessage ?? ""}`.toLowerCase();
  const esTokenInexistente = tres.answer?.errorCode === "PSP_030"
    || (/token|alias/.test(m) && !/opci|option|autoriz|allow|habilit/.test(m));
  console.log(esTokenInexistente
    ? "• 0 clic (MIT): se queja del TOKEN, no de la opción → la cuenta parece\n" +
      "  tenerlo. Probar de nuevo con un token real antes de cantar victoria.\n" +
      "  Si se confirma, hay que revisar el contrato con GMoney al 3,776 %."
    : "• 0 clic (MIT): no se queja del token sino de otra cosa → casi seguro falta\n" +
      '  la opción "API REST de pago en modo campos incrustados". Eso se le pide\n' +
      "  a Izipay. Mientras tanto, GMoney sigue siendo la única vía.");
}
console.log("\nOjo: Izipay exige CVV y autenticación en el pago 1 clic, igual que\n" +
            "Mercado Pago. Lo único que cobra sin el cliente delante es el 0 clic.");
