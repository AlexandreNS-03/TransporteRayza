-- ============================================================================
-- Acompañantes frecuentes: la gente con la que el cliente suele viajar,
-- guardada para no escribir sus datos en cada compra.
--
--   Opción A (desde tu máquina, parado en el repo):
--       mysql -h <host-publico> -P <puerto> -u root -p railway < Backend/sql/acompanantes-frecuentes.sql
--
--   Opción B (consola del contenedor de MySQL en Railway):
--       mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway <<'SQL'
--       ... pegar acá el contenido ...
--       SQL
--
-- SON DATOS DE OTRA PERSONA. El que los carga es el titular de la cuenta; el
-- acompañante no dio permiso ni se enteró. Por eso se guarda solo lo que ya se
-- escribe al comprar —nombre, documento, nacimiento, sexo y un teléfono— y
-- nada que sirva para contactarlo por nuestra cuenta: ni correo, ni dirección.
--
-- Se guarda la FECHA DE NACIMIENTO y no la edad: una edad guardada queda mal al
-- año siguiente sin que nadie lo note, y la edad va al manifiesto.
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `acompanantes_frecuentes` (
  `id`               VARCHAR(36)  NOT NULL,
  `cliente_id`       VARCHAR(36)  NOT NULL COMMENT 'De quien es la lista',
  `nombre_completo`  VARCHAR(150) NOT NULL,
  `tipo_documento`   VARCHAR(12)  NOT NULL COMMENT 'DNI|CE|PASAPORTE|CPF',
  `numero_documento` VARCHAR(30)  NOT NULL,
  `fecha_nacimiento` DATE             NULL,
  `sexo`             VARCHAR(12)      NULL COMMENT 'Masculino|Femenino|Otro, como lo guarda la venta',
  `telefono`         VARCHAR(20)      NULL,
  `created_at`       DATETIME         NULL,
  `updated_at`       DATETIME         NULL,
  PRIMARY KEY (`id`),
  KEY `idx_acompanante_cliente` (`cliente_id`),
  -- La misma persona no entra dos veces en la lista: se reconoce por el
  -- documento, así que corregir el nombre actualiza en vez de duplicar.
  UNIQUE KEY `uq_acompanante_cliente_documento` (`cliente_id`, `tipo_documento`, `numero_documento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
