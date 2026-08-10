// Mide cuánto pesa lo que el navegador descarga ANTES de mostrar la primera
// pantalla: el módulo de entrada, lo que viene precargado con él y el CSS.
//
// No falla el build; avisa. La idea es enterarse en el PR, no meses después.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const TOPE_KB = 140;                     // comprimido, con margen sobre los ~116 de hoy
const dist = "dist";

const html = readFileSync(join(dist, "index.html"), "utf8");
const archivos = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+)"/g)].map(m => m[1]);

let total = 0;
const detalle = [];
for (const rel of [...new Set(archivos)]) {
  const ruta = join(dist, rel);
  try {
    const bytes = readFileSync(ruta);
    const gz = gzipSync(bytes).length;
    total += gz;
    detalle.push(`  ${rel.padEnd(46)} ${(gz / 1024).toFixed(1)} kB`);
  } catch {
    // referencia a un archivo que no existe: lo reporta el build, no esto
  }
}

console.log("Carga inicial de la web del cliente (comprimida):");
console.log(detalle.join("\n"));
const kb = total / 1024;
console.log(`  TOTAL${" ".repeat(43)} ${kb.toFixed(1)} kB  (tope recomendado: ${TOPE_KB} kB)`);

if (kb > TOPE_KB) {
  console.log(`\n::warning::La carga inicial subió a ${kb.toFixed(1)} kB, por encima de los ${TOPE_KB} kB recomendados.`);
  console.log("Revisa si algo que solo se usa a veces quedó en el paquete principal;");
  console.log("se resuelve trayéndolo con import() cuando haga falta.");
}
