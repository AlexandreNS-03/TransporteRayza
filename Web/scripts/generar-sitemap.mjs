/**
 * Genera sitemap.xml y robots.txt dentro de public/ antes de compilar.
 *
 * Se generan en vez de escribirse a mano para que no queden viejos: las páginas
 * de destino salen de src/destinos.js, así que al agregar un destino nuevo entra
 * solo al sitemap sin que nadie tenga que acordarse.
 *
 * El sitio se publica arrastrando dist/ a Netlify, y Vite copia public/ dentro
 * de dist/, así que ambos archivos terminan servidos en la raíz del dominio.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DESTINOS } from "../src/destinos.js";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ_WEB = resolve(AQUI, "..");

/**
 * Dominio público del sitio. Se puede sobreescribir al compilar:
 *   SITIO_URL=https://www.transporterayza.com npm run build
 * Debe ser exactamente el que responde: para Google, con www y sin www son
 * sitios distintos, y una URL que redirige o no existe invalida el sitemap.
 */
const SITIO = (process.env.SITIO_URL || "https://transporterayza.com").replace(/\/+$/, "");

/**
 * Solo páginas públicas que valga la pena mostrar en un resultado de búsqueda.
 *
 * Quedan fuera a propósito: /ingresar y /mi-cuenta e /historial (privadas, y una
 * cuenta ajena no le sirve a nadie que llegue de Google), y /pagar-reserva
 * (necesita el código de una compra concreta, sin él no muestra nada).
 */
const PAGINAS = [
  { ruta: "/",              archivo: "src/pages/Landing.jsx" },
  { ruta: "/comprar",       archivo: "src/pages/Comprar.jsx" },
  { ruta: "/destinos",      archivo: "src/pages/Destinos.jsx" },
  { ruta: "/servicios",     archivo: "src/pages/Servicios.jsx" },
  { ruta: "/rastreo",       archivo: "src/pages/Rastreo.jsx" },
  { ruta: "/paga-tu-carga", archivo: "src/pages/PagaCarga.jsx" },
  { ruta: "/contacto",      archivo: "src/pages/Contacto.jsx" },
  { ruta: "/clausulas",     archivo: "src/pages/Clausulas.jsx" },
  { ruta: "/privacidad",    archivo: "src/pages/Privacidad.jsx" },
  ...DESTINOS.map((d) => ({ ruta: `/destinos/${d.slug}`, archivo: "src/destinos.js" })),
];

const HOY = new Date().toISOString().slice(0, 10);

/**
 * Fecha del último cambio real de la página, sacada de git. Poner la fecha de
 * compilación en todas haría que cada despliegue declare "todo cambió", y
 * Google termina desconfiando de un lastmod que siempre miente.
 */
function ultimoCambio(archivoRelativo) {
  try {
    const salida = execFileSync(
      "git",
      ["log", "-1", "--format=%cs", "--", archivoRelativo],
      { cwd: RAIZ_WEB, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(salida) ? salida : HOY;
  } catch {
    return HOY;   // sin git (o archivo nuevo): la fecha de hoy es lo más honesto
  }
}

const escapar = (t) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const urls = PAGINAS.map(({ ruta, archivo }) => {
  const loc = escapar(SITIO + ruta);
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${ultimoCambio(archivo)}</lastmod>\n  </url>`;
}).join("\n");

// Sin <changefreq> ni <priority>: Google los ignora desde hace años y solo
// ensucian el archivo con datos que nadie lee ni mantiene.
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const robots = `# Transportes Rayza
User-agent: *
Allow: /

# Páginas de cuenta y de pago: no aportan nada en un resultado de búsqueda y
# dependen de una sesión o de un código de compra.
Disallow: /mi-cuenta
Disallow: /historial
Disallow: /ingresar
Disallow: /pagar-reserva

Sitemap: ${SITIO}/sitemap.xml
`;

const destino = join(RAIZ_WEB, "public");
mkdirSync(destino, { recursive: true });
writeFileSync(join(destino, "sitemap.xml"), sitemap, "utf8");
writeFileSync(join(destino, "robots.txt"), robots, "utf8");

console.log(`[sitemap] ${PAGINAS.length} páginas para ${SITIO}`);
