-- Estado de pago de la encomienda: PENDIENTE / PAGADO / PAGA_DESTINO.
-- Las encomiendas existentes se marcan como PAGADO (se cobraban al registrar).
-- Idempotente.

SET @db := DATABASE();

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='encomiendas' AND COLUMN_NAME='estado_pago'),
  'ALTER TABLE encomiendas ADD COLUMN estado_pago varchar(20) DEFAULT ''PAGADO'' AFTER estado',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Rellena las que quedaron en NULL (por si la columna ya existía sin default)
UPDATE encomiendas SET estado_pago = 'PAGADO' WHERE estado_pago IS NULL;
