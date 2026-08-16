-- ============================================================================
-- Tramos bloqueados por ruta: para rutas con una parada intermedia nueva
-- (ej. "Nuevo Sol" entre Requena e Iquitos) donde solo deben venderse los
-- tramos adyacentes (Requena↔Nuevo Sol, Nuevo Sol↔Iquitos) y no el tramo
-- directo que se salta la parada (Requena↔Iquitos).
--
--   mysql -h <host> -P <puerto> -u <usuario> -p <base> < Backend/sql/ruta-tramos-bloqueados.sql
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `ruta_tramos_bloqueados` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `ruta_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `origen_tramo` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `destino_tramo` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `orden_origen` smallint NOT NULL,
  `orden_destino` smallint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_tramo_bloqueado_ruta` (`ruta_id`),
  CONSTRAINT `fk_tramo_bloqueado_ruta` FOREIGN KEY (`ruta_id`) REFERENCES `rutas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
