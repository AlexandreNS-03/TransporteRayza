/**
 * Consentimiento de cookies de analítica. Guarda la decisión del visitante en el
 * navegador: "accepted" o "rejected". Si no hay decisión, se muestra el aviso.
 */
const KEY = "consent-cookies";

export function consentActual() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function guardarConsent(valor) {
  try { localStorage.setItem(KEY, valor); } catch { /* modo privado */ }
}
