-- ============================================================================
-- Contacto de emergencia y documentos de viaje del cliente.
--
--   Opción A (desde tu máquina, parado en el repo):
--       mysql -h <host-publico> -P <puerto> -u root -p railway < Backend/sql/emergencia-y-documentos.sql
--
--   Opción B (consola del contenedor de MySQL en Railway):
--       mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway <<'SQL'
--       ... pegar acá el contenido ...
--       SQL
--
-- El contacto de emergencia va en la cuenta y no en cada compra porque es el
-- mismo siempre, y porque el día que haga falta nadie va a tener tiempo de
-- buscarlo.
--
-- Los documentos van en tabla aparte porque son varios: acá se viaja con DNI
-- dentro del país y con pasaporte o CPF cuando se cruza a Brasil. Un número de
-- documento es dato personal: se guarda porque hace falta para emitir el pasaje
-- y para el manifiesto, y el cliente lo puede borrar cuando quiera.
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

-- ── Contacto de emergencia, en clientes ──
DROP PROCEDURE IF EXISTS agregar_columna_si_falta;
DELIMITER //
CREATE PROCEDURE agregar_columna_si_falta(IN tabla VARCHAR(64), IN columna VARCHAR(64), IN definicion TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tabla AND COLUMN_NAME = columna) THEN
    SET @sql = CONCAT('ALTER TABLE `', tabla, '` ADD COLUMN `', columna, '` ', definicion);
    PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
  END IF;
END //
DELIMITER ;

CALL agregar_columna_si_falta('clientes', 'emergencia_nombres',     'VARCHAR(150) NULL');
CALL agregar_columna_si_falta('clientes', 'emergencia_apellidos',   'VARCHAR(150) NULL');
CALL agregar_columna_si_falta('clientes', 'emergencia_relacion',    'VARCHAR(40)  NULL');
CALL agregar_columna_si_falta('clientes', 'emergencia_codigo_pais', 'VARCHAR(6)   NULL');
CALL agregar_columna_si_falta('clientes', 'emergencia_telefono',    'VARCHAR(20)  NULL');

DROP PROCEDURE IF EXISTS agregar_columna_si_falta;

-- ── Documentos de viaje ──
CREATE TABLE IF NOT EXISTS `documentos_viaje` (
  `id`               VARCHAR(36) NOT NULL,
  `cliente_id`       VARCHAR(36) NOT NULL,
  `tipo`             VARCHAR(12) NOT NULL COMMENT 'DNI|CE|PASAPORTE|CPF',
  `pais_emision`     VARCHAR(2)      NULL COMMENT 'ISO-2 del pais que lo emitio',
  `numero`           VARCHAR(30) NOT NULL,
  `fecha_expiracion` DATE            NULL COMMENT 'NULL si ese documento no vence',
  `created_at`       DATETIME        NULL,
  `updated_at`       DATETIME        NULL,
  PRIMARY KEY (`id`),
  KEY `idx_documento_cliente` (`cliente_id`),
  -- El mismo documento no se guarda dos veces: si lo renovaron y cambió la
  -- fecha, se actualiza. Dos filas con fechas distintas es peor que ninguna.
  UNIQUE KEY `uq_documento_cliente_tipo_numero` (`cliente_id`, `tipo`, `numero`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
