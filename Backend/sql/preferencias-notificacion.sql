-- ============================================================================
-- Preferencias de notificación: por dónde le escribimos a cada cliente y para
-- qué.
--
--   Opción A (desde tu máquina, parado en el repo):
--       mysql -h <host-publico> -P <puerto> -u root -p railway < Backend/sql/preferencias-notificacion.sql
--
--   Opción B (consola del contenedor de MySQL en Railway):
--       mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway <<'SQL'
--       ... pegar acá el contenido ...
--       SQL
--
-- SON DOS COSAS DISTINTAS Y LA LEY LAS TRATA DISTINTO.
--
-- Lo informativo es parte del servicio que el cliente compró: el boleto, el
-- comprobante, el aviso de que su viaje cambió de hora. Eso no se pregunta. Por
-- eso NO hay columna para el correo informativo: va siempre, y apagarlo sería
-- venderle un pasaje que no puede mostrar al embarcar.
--
-- Lo promocional es publicidad y necesita que diga que sí. Viene apagado, y
-- cuando lo enciende queda anotado CUÁNDO y DESDE DÓNDE, porque la Ley 29733
-- pide poder demostrar ese consentimiento y un booleano suelto no demuestra
-- nada. Apagarlo también queda anotado.
--
-- Las cuentas que ya existen no necesitan fila: sin fila, todo lo promocional
-- está apagado, que es lo correcto — nadie les preguntó nunca.
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `preferencias_notificacion` (
  `cliente_id`        VARCHAR(36) NOT NULL,
  `info_whatsapp`     TINYINT(1)      NULL DEFAULT 0,
  `info_sms`          TINYINT(1)      NULL DEFAULT 0,
  `promo_email`       TINYINT(1)      NULL DEFAULT 0,
  `promo_whatsapp`    TINYINT(1)      NULL DEFAULT 0,
  `promo_sms`         TINYINT(1)      NULL DEFAULT 0,
  `promo_aceptado_at` DATETIME        NULL COMMENT 'Cuando dijo que si a la publicidad',
  `promo_revocado_at` DATETIME        NULL COMMENT 'Cuando la apago del todo',
  `promo_origen`      VARCHAR(40)     NULL COMMENT 'Donde lo dijo: "cuenta web"',
  `updated_at`        DATETIME        NULL,
  PRIMARY KEY (`cliente_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
