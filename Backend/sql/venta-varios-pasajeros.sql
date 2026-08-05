-- Venta de varios pasajes en una sola operación: las ventas del mismo grupo
-- comparten grupo_venta_id, y el comprobante que las cubre guarda ese mismo
-- identificador para saber que ya están facturadas. Idempotente.

SET @db := DATABASE();

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ventas' AND COLUMN_NAME='grupo_venta_id'),
  'ALTER TABLE ventas ADD COLUMN grupo_venta_id varchar(36) DEFAULT NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ventas' AND INDEX_NAME='idx_ventas_grupo'),
  'CREATE INDEX idx_ventas_grupo ON ventas (grupo_venta_id)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='comprobantes' AND COLUMN_NAME='grupo_venta_id'),
  'ALTER TABLE comprobantes ADD COLUMN grupo_venta_id varchar(36) DEFAULT NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='comprobantes' AND INDEX_NAME='idx_comprobantes_grupo'),
  'CREATE INDEX idx_comprobantes_grupo ON comprobantes (grupo_venta_id)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
