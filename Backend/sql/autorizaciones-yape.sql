-- ============================================================================
-- Yape On File: las autorizaciones que los clientes dan una vez para que se
-- les pueda cobrar después sin abrir la app.
--
--   Opción A (desde tu máquina, parado en el repo):
--       mysql -h <host-publico> -P <puerto> -u root -p railway < Backend/sql/autorizaciones-yape.sql
--
--   Opción B (consola del contenedor de MySQL en Railway):
--       mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway <<'SQL'
--       ... pegar acá el contenido ...
--       SQL
--
-- NO hace falta correrlo todavía: el prototipo corre simulado y apagado
-- (yape.onfile.enabled=false). Esto va cuando se firme el contrato.
--
-- Acá no se guarda nada sensible: ni el celular completo, ni claves, ni datos
-- de la cuenta del cliente. Solo el token que devuelve el proveedor, que sin
-- las credenciales del comercio no sirve para cobrarle a nadie.
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `autorizaciones_yape` (
  `id`                 VARCHAR(36)  NOT NULL,
  `cliente_email`      VARCHAR(150) NOT NULL,
  `cliente_nombre`     VARCHAR(150)     NULL,
  `celular_final`      VARCHAR(4)       NULL COMMENT 'Solo los 4 últimos, para que la persona reconozca su cuenta',
  `token`              VARCHAR(200)     NULL COMMENT 'Identificador que devuelve el proveedor',
  `estado`             VARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE',
  `referencia_externa` VARCHAR(120)     NULL,
  `motivo_baja`        VARCHAR(200)     NULL,
  `created_at`         DATETIME         NULL,
  `autorizado_at`      DATETIME         NULL,
  `revocado_at`        DATETIME         NULL,
  PRIMARY KEY (`id`),
  -- Se busca siempre por cliente + estado: es como se encuentra la vigente.
  KEY `ix_autyape_cliente_estado` (`cliente_email`, `estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'listo: tabla autorizaciones_yape' AS resultado;
