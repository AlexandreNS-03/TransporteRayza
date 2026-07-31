/**
 * Google Analytics 4 (gtag.js).
 *
 * Carga SOLO en el build de producción (no en `npm run dev`), para no ensuciar las
 * métricas con el tráfico de desarrollo. El Measurement ID es público (va en la
 * página); por defecto usa el de la cuenta, y se puede sobreescribir con VITE_GA_ID.
 */
const GA_ID = import.meta.env.VITE_GA_ID || "G-SS3HS2BKCP";
let cargado = false;

export function iniciarGA() {
  if (cargado || !import.meta.env.PROD || !GA_ID) return;   // una vez, y nada en desarrollo
  cargado = true;

  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", GA_ID);
}
