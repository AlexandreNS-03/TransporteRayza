-- ============================================================================
-- Tarjetas guardadas: las que el cliente deja listas para no volver a
-- escribirlas en cada compra.
--
--   Opción A (desde tu máquina, parado en el repo):
--       mysql -h <host-publico> -P <puerto> -u root -p railway < Backend/sql/tarjetas-guardadas.sql
--
--   Opción B (consola del contenedor de MySQL en Railway):
--       mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway <<'SQL'
--       ... pegar acá el contenido ...
--       SQL
--
-- ACÁ NO HAY NINGUNA TARJETA. No se guarda el número, ni el código de
-- seguridad, ni nada que sirva para cobrar por fuera. Solo el identificador
-- que devuelve Izipay —el token— más la marca y los cuatro últimos dígitos,
-- que son para que la persona reconozca cuál de sus tarjetas es.
--
-- El número nunca pasa por nuestro servidor: lo escribe el cliente dentro del
-- formulario de Izipay. Guardar números de tarjeta exigiría cumplir PCI DSS y
-- no tiene ningún sentido hacerlo cuando el proveedor ya lo hace por nosotros.
--
-- Se puede correr ahora: la tabla vacía no molesta, y guardar tarjetas está
-- apagado (izipay.tarjetas-guardadas.enabled=false) hasta que Izipay confirme
-- que la cuenta de comercio tiene habilitado el registro de tarjetas.
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `tarjetas_guardadas` (
  `id`            VARCHAR(36)  NOT NULL,
  `cliente_email` VARCHAR(150) NOT NULL,
  `marca`         VARCHAR(30)      NULL COMMENT 'Visa, Mastercard… lo dice el proveedor',
  `ultimos4`      VARCHAR(4)       NULL COMMENT 'Solo los 4 últimos, para reconocerla',
  `vence_mes`     INT              NULL,
  `vence_anio`    INT              NULL,
  `token`         VARCHAR(200) NOT NULL COMMENT 'Identificador de Izipay; sin nuestras credenciales no sirve',
  `estado`        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVA',
  `preferida`     TINYINT(1)       NULL DEFAULT 0,
  `motivo_baja`   VARCHAR(200)     NULL,
  `created_at`    DATETIME         NULL,
  `usada_at`      DATETIME         NULL,
  `revocada_at`   DATETIME         NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tarjeta_cliente` (`cliente_email`, `estado`),
  -- Una tarjeta por cliente y token: si vuelve a pagar con la misma, se
  -- actualiza en vez de duplicarse.
  UNIQUE KEY `uq_tarjeta_cliente_token` (`cliente_email`, `token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
