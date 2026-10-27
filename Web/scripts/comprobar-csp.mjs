/**
 * Comprueba que public/_headers y netlify.toml digan lo mismo.
 *
 * Los dos declaran los encabezados de seguridad, y cuál manda depende de cómo
 * se despliegue: `netlify.toml` queda FUERA de dist/, así que un despliegue
 * manual —arrastrar la carpeta— solo lee `public/_headers`; uno desde Git lee
 * el toml. Mientras digan lo mismo da igual cuál se use.
 *
 * Ya se separaron una vez y nadie se enteró: al toml le habían agregado
 * fonts.googleapis.com y _headers se quedó sin él. El sitio desplegado a mano
 * se habría quedado sin Poppins ni Inter, en silencio, porque un CSP no rompe
 * nada: solo deja de cargar lo que no permite.
 *
 * Corre antes de cada build para que no pueda olvidarse.
 */
import { readFileSync } from "node:fs";

const politica = (texto) => {
  // El espacio antes del signo importa: el toml escribe `Policy = "..."` y
  // _headers escribe `Policy: ...`.
  const m = texto.match(/Content-Security-Policy\s*[:=]\s*"?([^"\n]+)/);
  return m ? m[1].trim().replace(/"$/, "") : null;
};

const porDirectiva = (p) =>
  Object.fromEntries(
    p.split(";").map((d) => d.trim()).filter(Boolean)
     .map((d) => [d.split(/\s+/)[0], d.split(/\s+/).slice(1).sort().join(" ")])
  );

const a = politica(readFileSync("public/_headers", "utf8"));
const b = politica(readFileSync("netlify.toml", "utf8"));

if (!a || !b) {
  console.error("✖ No encontré el Content-Security-Policy en uno de los dos archivos.");
  process.exit(1);
}

const da = porDirectiva(a);
const db = porDirectiva(b);
const problemas = [];

for (const clave of new Set([...Object.keys(da), ...Object.keys(db)])) {
  if (da[clave] !== db[clave]) {
    problemas.push(
      `  ${clave}\n` +
      `    public/_headers : ${da[clave] ?? "(no está)"}\n` +
      `    netlify.toml    : ${db[clave] ?? "(no está)"}`
    );
  }
}

if (problemas.length) {
  console.error("✖ El CSP de public/_headers y el de netlify.toml no coinciden:\n");
  console.error(problemas.join("\n"));
  console.error("\n  Cuál manda depende de cómo se despliegue, así que tienen que decir lo mismo.");
  process.exit(1);
}

console.log("✓ El CSP coincide en public/_headers y netlify.toml");
