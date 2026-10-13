-- ============================================================================
-- La cuenta del cliente: verificación del correo y los datos que pide la
-- Capitanía para el manifiesto de pasajeros.
--
--   Opción A (desde tu máquina, parado en el repo):
--       mysql -h <host-publico> -P <puerto> -u root -p railway < Backend/sql/cuenta-del-cliente.sql
--
--   Opción B (consola del contenedor de MySQL en Railway):
--       mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway <<'SQL'
--       ... pegar acá el contenido ...
--       SQL
--
-- Las cuentas que ya existen quedan SIN verificar (email_verificado_at NULL),
-- que es lo correcto: nunca se comprobó que esos correos fueran de quien dice.
-- Pueden verificarse solas desde su cuenta cuando entren.
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

-- ── Campos nuevos en clientes ──
-- Género y nacionalidad los pide la Capitanía para el manifiesto; se guardan
-- en el perfil para no escribirlos en cada compra.
SET @hay := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes' AND COLUMN_NAME = 'genero');
SET @sql := IF(@hay = 0,
  'ALTER TABLE `clientes` ADD COLUMN `genero` VARCHAR(12) NULL COMMENT ''MASCULINO|FEMENINO|OTRO, para el manifiesto''',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @hay := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes' AND COLUMN_NAME = 'nacionalidad');
SET @sql := IF(@hay = 0,
  'ALTER TABLE `clientes` ADD COLUMN `nacionalidad` VARCHAR(2) NULL COMMENT ''ISO-2 del pais de nacionalidad''',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @hay := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes' AND COLUMN_NAME = 'email_verificado_at');
SET @sql := IF(@hay = 0,
  'ALTER TABLE `clientes` ADD COLUMN `email_verificado_at` DATETIME NULL COMMENT ''NULL = correo sin confirmar''',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── Enlaces de verificación ──
-- Tabla aparte de la de recuperar contraseña a propósito: un enlace para
-- confirmar un correo no puede terminar sirviendo para cambiar una clave.
-- Del token se guarda el hash, nunca el token.
CREATE TABLE IF NOT EXISTS `verificaciones_email` (
  `id`         VARCHAR(36)  NOT NULL,
  `token_hash` VARCHAR(64)  NOT NULL,
  `cliente_id` VARCHAR(36)  NOT NULL,
  `email`      VARCHAR(150) NOT NULL,
  `expira_at`  DATETIME     NOT NULL,
  `usado_at`   DATETIME         NULL,
  `created_at` DATETIME         NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_verificacion_token` (`token_hash`),
  KEY `idx_verificacion_cliente` (`cliente_id`, `usado_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
