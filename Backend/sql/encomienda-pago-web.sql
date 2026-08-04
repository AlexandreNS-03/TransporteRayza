-- Pago en línea de encomiendas: guarda la referencia de la transacción
-- (Izipay / Yape) para poder rastrear el cobro. Idempotente.

SET @db := DATABASE();

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='encomiendas' AND COLUMN_NAME='pasarela_referencia'),
  'ALTER TABLE encomiendas ADD COLUMN pasarela_referencia varchar(100) DEFAULT NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
