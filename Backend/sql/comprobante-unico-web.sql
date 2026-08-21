-- ============================================================================
-- Preferencia de comprobante en la compra en línea: un solo documento por toda
-- la compra (lo normal) o uno por pasajero.
--
-- Hasta ahora la web emitía un comprobante por pasaje sin remedio, y además no
-- agrupaba los pasajes de una misma compra: quien compraba 3 pasajes recibía 3
-- boletas y en el sistema aparecían como 3 ventas sin relación entre sí.
--
--   mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway < Backend/sql/comprobante-unico-web.sql
--
-- La columna admite NULL a propósito: es lo que queda en las ventas de mostrador
-- y en las compras web anteriores, y se interpreta como "un solo comprobante",
-- que es el comportamiento deseado.
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

SET @db := DATABASE();

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ventas' AND COLUMN_NAME='comprobante_unico'),
  'ALTER TABLE ventas ADD COLUMN comprobante_unico tinyint(1) DEFAULT NULL AFTER grupo_venta_id',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
