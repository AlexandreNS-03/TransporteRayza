-- Tramo de la encomienda dentro del viaje: muchas bajan en una parada
-- intermedia, no siempre en la sucursal de destino. Idempotente.

SET @db := DATABASE();

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='encomiendas' AND COLUMN_NAME='parada_origen'),
  'ALTER TABLE encomiendas ADD COLUMN parada_origen varchar(100) DEFAULT NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='encomiendas' AND COLUMN_NAME='parada_destino'),
  'ALTER TABLE encomiendas ADD COLUMN parada_destino varchar(100) DEFAULT NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='encomiendas' AND COLUMN_NAME='orden_origen'),
  'ALTER TABLE encomiendas ADD COLUMN orden_origen smallint DEFAULT NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='encomiendas' AND COLUMN_NAME='orden_destino'),
  'ALTER TABLE encomiendas ADD COLUMN orden_destino smallint DEFAULT NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
