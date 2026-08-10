package com.example.demo.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Respaldo de la información del sistema.
 *
 * Genera un ZIP con un CSV por tabla, que se abre con Excel sin instalar nada. La
 * idea es que la empresa tenga su propia copia de los datos aunque un día se pierda
 * el acceso al servidor: pasajes, encomiendas, comprobantes, caja, todo.
 *
 * No reemplaza al respaldo automático del proveedor de la base, que es el que sirve
 * para restaurar el sistema completo. Este es la copia que se guarda en la oficina.
 */
@Service
public class BackupService {

    /** Datos que no salen del servidor ni en un respaldo. */
    private static final Set<String> COLUMNAS_OCULTAS = Set.of("password", "clave_seguridad");

    /** Tablas que no aportan a un respaldo de la operación. */
    private static final Set<String> TABLAS_EXCLUIDAS = Set.of("flyway_schema_history");

    private final JdbcTemplate jdbc;
    private final AuditoriaService auditoriaService;

    public BackupService(JdbcTemplate jdbc, AuditoriaService auditoriaService) {
        this.jdbc = jdbc;
        this.auditoriaService = auditoriaService;
    }

    public String nombreArchivo() {
        return "respaldo-rayza-"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd-HHmm"))
                + ".zip";
    }

    /** Arma el ZIP completo en memoria. */
    public byte[] generar(String usuarioNombre) {
        List<String> tablas = jdbc.queryForList("""
                SELECT TABLE_NAME FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
                ORDER BY TABLE_NAME
                """, String.class);

        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        List<String> resumen = new ArrayList<>();

        try (ZipOutputStream zip = new ZipOutputStream(salida)) {
            for (String tabla : tablas) {
                if (TABLAS_EXCLUIDAS.contains(tabla)) continue;
                try {
                    String csv = volcarTabla(tabla);
                    int filas = (int) csv.lines().count() - 1;
                    resumen.add(tabla + ": " + Math.max(0, filas) + " registro(s)");
                    zip.putNextEntry(new ZipEntry("datos/" + tabla + ".csv"));
                    // BOM para que Excel abra los acentos bien
                    zip.write(new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF});
                    zip.write(csv.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                    zip.closeEntry();
                } catch (Exception e) {
                    resumen.add(tabla + ": NO se pudo respaldar (" + e.getMessage() + ")");
                }
            }

            zip.putNextEntry(new ZipEntry("LEEME.txt"));
            zip.write(leeme(resumen, usuarioNombre).getBytes(java.nio.charset.StandardCharsets.UTF_8));
            zip.closeEntry();
        } catch (Exception e) {
            throw new RuntimeException("No se pudo generar el respaldo: " + e.getMessage());
        }

        auditoriaService.registrar("RESPALDO", "SISTEMA", null,
                "Respaldo generado (" + tablas.size() + " tablas) por " + usuarioNombre);
        return salida.toByteArray();
    }

    /** Una tabla completa como CSV, con la primera fila de encabezados. */
    private String volcarTabla(String tabla) {
        List<Map<String, Object>> filas = jdbc.queryForList("SELECT * FROM `" + tabla + "`");

        List<String> columnas = filas.isEmpty()
                ? jdbc.queryForList("""
                    SELECT COLUMN_NAME FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION
                    """, String.class, tabla)
                : new ArrayList<>(filas.get(0).keySet());

        StringBuilder sb = new StringBuilder();
        sb.append(String.join(",", columnas.stream().map(BackupService::celda).toList())).append("\n");
        for (Map<String, Object> fila : filas) {
            List<String> valores = new ArrayList<>();
            for (String col : columnas) {
                valores.add(COLUMNAS_OCULTAS.contains(col.toLowerCase())
                        ? "(oculto)"
                        : celda(fila.get(col)));
            }
            sb.append(String.join(",", valores)).append("\n");
        }
        return sb.toString();
    }

    /** Valor listo para CSV: entre comillas y con las comillas internas dobladas. */
    private static String celda(Object valor) {
        if (valor == null) return "";
        String s = String.valueOf(valor).replace("\"", "\"\"");
        return "\"" + s + "\"";
    }

    private String leeme(List<String> resumen, String usuario) {
        return """
                RESPALDO DE TRANSPORTES RAYZA
                =============================

                Generado: %s
                Por: %s

                Qué hay acá dentro
                ------------------
                Una carpeta "datos" con un archivo CSV por cada tabla del sistema. Se
                abren con Excel haciendo doble clic.

                Contenido:
                %s

                Cosas que conviene saber
                ------------------------
                - Las contraseñas de los usuarios y las claves de recojo de las encomiendas
                  NO se incluyen: aparecen como "(oculto)".
                - Este respaldo es la copia de la empresa, para consultar o rearmar datos.
                  Para restaurar el sistema completo se usa el respaldo del proveedor de la
                  base de datos.
                - Guárdalo en un lugar seguro: contiene datos personales de pasajeros
                  (nombres, documentos, teléfonos).
                """.formatted(LocalDateTime.now(), usuario, String.join("\n", resumen));
    }
}
