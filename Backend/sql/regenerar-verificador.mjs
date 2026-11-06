/**
 * Regenera `verificar-esquema.sql` desde las entidades JPA.
 *
 *     node Backend/sql/regenerar-verificador.mjs
 *
 * Por qué existe: la lista de tablas y columnas que el verificador compara se
 * escribía a mano. Quedó sin tocar desde julio de 2026 mientras entraban seis
 * migraciones, así que contestaba "todo al día" sobre una base a la que le
 * faltaba media wallet. Un verificador desactualizado es peor que ninguno: da
 * confianza falsa.
 *
 * No lee los archivos .java. Arranca el contexto de Spring con el perfil de
 * test —H2 en memoria, el esquema lo arma Hibernate— y le pide que vuelque el
 * DDL. Así la lista sale de lo que el backend realmente va a pedirle a MySQL,
 * con la misma traducción de nombres (camelCase → snake_case, @Column,
 * @JoinColumn, tablas de relación), en vez de una lectura a ojo que se
 * equivoca justo en los casos raros.
 *
 * Al agregar una migración, correr esto en el mismo PR.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const sqlDir = dirname(fileURLToPath(import.meta.url));
const backend = join(sqlDir, "..");
const destino = join(sqlDir, "verificar-esquema.sql");
const volcado = join(mkdtempSync(join(tmpdir(), "esquema-")), "entidades.sql");

console.log("Arrancando el backend con el perfil de test para que Hibernate arme el esquema…");
execFileSync(
  join(backend, "mvnw"),
  ["-q", "-Dtest=DemoApplicationTests", "test",
   "-Dspring.jpa.properties.jakarta.persistence.schema-generation.scripts.action=create",
   `-Dspring.jpa.properties.jakarta.persistence.schema-generation.scripts.create-target=${volcado}`],
  { cwd: backend, stdio: ["ignore", "ignore", "inherit"] },
);

// ── Del DDL de Hibernate a una lista de tablas y columnas ──
// Las líneas que no son columnas (la clave primaria, las restricciones) se
// descartan; los `alter table` del final tampoco aportan nombres nuevos.
const ddl = readFileSync(volcado, "utf8");
const tablas = new Map();
for (const [, nombre, cuerpo] of ddl.matchAll(/create table (\w+) \(([\s\S]*?)\n\s*\);/g)) {
  const cols = cuerpo
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^(primary key|constraint|foreign key|unique|check)\b/i.test(l))
    .map((l) => l.split(/\s+/)[0])
    .filter((c) => /^\w+$/.test(c));
  tablas.set(nombre, [...new Set(cols)].sort());
}
rmSync(dirname(volcado), { recursive: true, force: true });

if (tablas.size === 0) throw new Error("El volcado no trajo ninguna tabla; revisar el DDL.");

const nombres = [...tablas.keys()].sort();
const union = (filas) => filas.map((f, i) => (i ? "  UNION ALL   " : "  ") + f).join("\n");

const sql = `-- ============================================================================
-- Verificación de esquema — ¿le falta alguna migración a esta base de datos?
--
--   mysql -h <host> -P <puerto> -u <usuario> -p <base> < Backend/sql/verificar-esquema.sql
--
-- No modifica nada. Si todo está al día no devuelve ninguna fila.
-- Cada fila que aparezca es una tabla o columna que el backend necesita y la
-- base no tiene: corre la migración correspondiente (ver README.md).
--
-- NO SE EDITA A MANO. Se regenera con:
--
--   node Backend/sql/regenerar-verificador.mjs
--
-- y eso va en el mismo PR que la migración. Escrito a mano quedó un año sin
-- tocar mientras entraban seis migraciones, contestando "todo al día" sobre una
-- base a la que le faltaban columnas.
--
-- Generado el ${new Date().toISOString().slice(0, 10)} desde ${tablas.size} entidades.
-- ============================================================================

-- 1) Tablas faltantes
SELECT 'TABLA FALTANTE' AS problema, t.tabla AS nombre, '' AS columna FROM (
${union(nombres.map((t) => `SELECT '${t}' AS tabla`))}
) t
LEFT JOIN information_schema.tables it
  ON it.table_schema = DATABASE() AND it.table_name = t.tabla
WHERE it.table_name IS NULL

UNION ALL

-- 2) Columnas faltantes
--    Solo mira tablas que existen: si falta la tabla entera ya la nombró el
--    bloque de arriba, y repetir sus treinta columnas tapa lo demás.
SELECT 'COLUMNA FALTANTE', c.tabla, c.col FROM (
${union(nombres.flatMap((t) => tablas.get(t).map((c) => `SELECT '${t}' AS tabla, '${c}' AS col`)))}
) c
JOIN information_schema.tables it
  ON it.table_schema = DATABASE() AND it.table_name = c.tabla
LEFT JOIN information_schema.columns ic
  ON ic.table_schema = DATABASE() AND ic.table_name = c.tabla AND ic.column_name = c.col
WHERE ic.column_name IS NULL;
`;

writeFileSync(destino, sql);
const totalCols = [...tablas.values()].reduce((n, c) => n + c.length, 0);
console.log(`Listo: ${tablas.size} tablas y ${totalCols} columnas en ${destino}`);
