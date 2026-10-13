-- ============================================================================
-- Verificación del celular: el código que se manda para comprobar que el
-- número de la cuenta es de quien dice.
--
--   Opción A (desde tu máquina, parado en el repo):
--       mysql -h <host-publico> -P <puerto> -u root -p railway < Backend/sql/verificacion-celular.sql
--
--   Opción B (consola del contenedor de MySQL en Railway):
--       mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway <<'SQL'
--       ... pegar acá el contenido ...
--       SQL
--
-- UN CÓDIGO DE SEIS DÍGITOS NO SE PROTEGE CON QUE VENZA. Hay un millón de
-- combinaciones y probar es gratis: lo que lo protege es contar los intentos,
-- por eso la columna `intentos`. A los cinco fallos el código muere.
--
-- Del código se guarda el hash, nunca el código.
--
-- Se puede correr ahora: la tabla vacía no molesta, y mandar el código está
-- apagado hasta que se contrate SMS o WhatsApp.
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

-- ── Campo nuevo en clientes ──
SET @hay := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes'
               AND COLUMN_NAME = 'telefono_verificado_at');
SET @sql := IF(@hay = 0,
  'ALTER TABLE `clientes` ADD COLUMN `telefono_verificado_at` DATETIME NULL COMMENT ''NULL = celular sin comprobar; se borra si cambia el numero''',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── Códigos enviados ──
CREATE TABLE IF NOT EXISTS `verificaciones_celular` (
  `id`          VARCHAR(36) NOT NULL,
  `codigo_hash` VARCHAR(64) NOT NULL COMMENT 'SHA-256 del codigo; el codigo no se guarda',
  `cliente_id`  VARCHAR(36) NOT NULL,
  `telefono`    VARCHAR(26) NOT NULL COMMENT 'A que numero se mando, completo',
  `canal`       VARCHAR(12)     NULL COMMENT 'SMS|WHATSAPP',
  `intentos`    INT         NOT NULL DEFAULT 0 COMMENT 'A los 5 fallos el codigo muere',
  `expira_at`   DATETIME    NOT NULL,
  `usado_at`    DATETIME        NULL,
  `created_at`  DATETIME        NULL,
  PRIMARY KEY (`id`),
  KEY `idx_verif_celular_cliente` (`cliente_id`, `usado_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
