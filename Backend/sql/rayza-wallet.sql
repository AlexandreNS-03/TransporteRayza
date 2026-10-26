-- ============================================================================
-- Rayza Wallet: saldo que el cliente deja guardado y gasta en pasajes.
--
--   Opción A (desde tu máquina, parado en el repo):
--       mysql -h <host-publico> -P <puerto> -u root -p railway < Backend/sql/rayza-wallet.sql
--
--   Opción B (consola del contenedor de MySQL en Railway):
--       mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway <<'EOSQL'
--       ... pegar acá el contenido ...
--       EOSQL
--
-- LA WALLET NO SE RETIRA Y NO VENCE, y eso es una decisión. Devolver saldo en
-- efectivo se parece a emitir dinero electrónico (Ley 29985, SBS); un crédito
-- que solo se gasta en nuestros pasajes es una venta anticipada. Y hacer que
-- caduque es quedarse con plata del cliente. Por eso acá no hay ninguna columna
-- de vencimiento: no es que falte, es que no va.
--
-- EL SALDO NO SE GUARDA, SE SUMA. No hay columna `saldo` en ninguna parte: el
-- saldo es SUM(monto) de `saldo_movimientos`. Si alguna vez no cuadra, se ve en
-- qué fila.
--
-- LA COLUMNA QUE IMPORTA ES `referencia`, y es ÚNICA. Es lo que impide que un
-- reintento del navegador, o el IPN de Izipay llegando además de la vuelta del
-- navegador, acrediten la misma plata dos veces. La aplicación también lo
-- revisa, pero el que de verdad lo garantiza es este índice.
--
-- Se puede correr ahora: recargar queda apagado hasta poner wallet.enabled=true.
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

-- ── Qué clase de movimiento es ──
-- Hasta ahora todos venían de una cancelación (saldo a favor), así que no hacía
-- falta distinguirlos. Los que ya existen quedan como SALDO_FAVOR, que es lo
-- que efectivamente son.
SET @hay := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saldo_movimientos'
               AND COLUMN_NAME = 'tipo');
SET @sql := IF(@hay = 0,
  'ALTER TABLE `saldo_movimientos` ADD COLUMN `tipo` VARCHAR(16) NOT NULL DEFAULT ''SALDO_FAVOR'' COMMENT ''SALDO_FAVOR|ABONO|CONSUMO|AJUSTE''',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── La llave contra el doble conteo ──
SET @hay := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saldo_movimientos'
               AND COLUMN_NAME = 'referencia');
SET @sql := IF(@hay = 0,
  'ALTER TABLE `saldo_movimientos` ADD COLUMN `referencia` VARCHAR(120) NULL COMMENT ''Llave de idempotencia: el mismo pago nunca se acredita dos veces''',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Única, pero aceptando NULL: los movimientos viejos no tienen referencia y en
-- MySQL varios NULL no chocan entre sí.
SET @hay := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saldo_movimientos'
               AND INDEX_NAME = 'uk_saldo_mov_referencia');
SET @sql := IF(@hay = 0,
  'ALTER TABLE `saldo_movimientos` ADD UNIQUE KEY `uk_saldo_mov_referencia` (`referencia`)',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Buscar el saldo de alguien es la consulta de cada carga de la cuenta, y la
-- lista va ordenada por fecha: el índice lleva las dos columnas.
SET @hay := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saldo_movimientos'
               AND INDEX_NAME = 'idx_saldo_mov_email');
SET @sql := IF(@hay = 0,
  'ALTER TABLE `saldo_movimientos` ADD KEY `idx_saldo_mov_email` (`cliente_email`, `created_at`)',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- El índice viejo era solo (cliente_email), que es exactamente el prefijo del de
-- arriba: MySQL puede usar el nuevo en su lugar y mantener los dos solo hace que
-- cada inserción escriba dos árboles. Se borra después de crear el otro, nunca
-- antes: si el ALTER de arriba fallara, la tabla no queda sin ningún índice.
SET @hay := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saldo_movimientos'
               AND INDEX_NAME = 'idx_saldo_email');
SET @tengoElNuevo := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saldo_movimientos'
               AND INDEX_NAME = 'idx_saldo_mov_email');
SET @sql := IF(@hay > 0 AND @tengoElNuevo > 0,
  'ALTER TABLE `saldo_movimientos` DROP INDEX `idx_saldo_email`',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ── Recargas empezadas ──
-- Esta tabla existe por una sola razón: SABER CUÁNTO SE ESPERABA COBRAR ANTES
-- DE QUE LA PASARELA CONTESTE. Sin esto, al volver del pago habría que creerle
-- al navegador cuánto se pagó, y eso es regalar plata: se paga S/ 20 y se pide
-- acreditar S/ 2000. El `id` es también el orderId que se le manda a Izipay.
CREATE TABLE IF NOT EXISTS `recargas_wallet` (
  `id`                  VARCHAR(60)    NOT NULL COMMENT 'Tambien es el orderId en Izipay; empieza con WAL-',
  `cliente_email`       VARCHAR(150)   NOT NULL,
  `monto`               DECIMAL(10,2)  NOT NULL COMMENT 'Lo que se espera cobrar; se compara contra lo que firma Izipay',
  `estado`              VARCHAR(12)    NOT NULL DEFAULT 'PENDIENTE' COMMENT 'PENDIENTE|PAGADA|FALLIDA',
  `referencia_pasarela` VARCHAR(120)       NULL,
  `motivo_falla`        VARCHAR(200)       NULL,
  `created_at`          DATETIME           NULL,
  `pagada_at`           DATETIME           NULL,
  PRIMARY KEY (`id`),
  KEY `idx_recargas_wallet_cliente` (`cliente_email`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
