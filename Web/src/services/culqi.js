// Integración con Culqi Checkout (https://docs.culqi.com).
// El dato de la tarjeta lo maneja el modal de Culqi; aquí solo recibimos un token.
// Sin VITE_CULQI_PUBLIC_KEY se usa MODO SIMULACIÓN (no abre modal, no cobra).

const PUBLIC_KEY = import.meta.env.VITE_CULQI_PUBLIC_KEY || "";
const SCRIPT_URL = "https://checkout.culqi.com/js/v4";

export function culqiSimulado() { return !PUBLIC_KEY; }

let scriptCargado = false;
function cargarScript() {
  return new Promise((resolve, reject) => {
    if (scriptCargado && window.Culqi) return resolve();
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.onload = () => { scriptCargado = true; resolve(); };
    s.onerror = () => reject(new Error("No se pudo cargar Culqi"));
    document.body.appendChild(s);
  });
}

export async function pagarConCulqi({ amountCents, title = "Transportes Rayza", description = "Pasaje", email = "" }) {
  if (!PUBLIC_KEY) return "tkn_simulado_" + Math.random().toString(36).slice(2, 14);

  await cargarScript();
  return new Promise((resolve, reject) => {
    const Culqi = window.Culqi;
    Culqi.publicKey = PUBLIC_KEY;
    Culqi.settings({ title, currency: "PEN", description, amount: amountCents });
    Culqi.options({ lang: "es", installments: false, paymentMethods: { tarjeta: true, yape: true } });

    window.culqi = function () {
      if (Culqi.token) resolve(Culqi.token.id);
      else if (Culqi.error) reject(new Error(Culqi.error.user_message || "Pago cancelado o rechazado"));
      else reject(new Error("No se completó el pago"));
    };

    Culqi.open();
  });
}
