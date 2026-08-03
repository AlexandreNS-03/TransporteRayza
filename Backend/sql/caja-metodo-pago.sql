-- Separar en la caja el efectivo del pago digital (Yape/Plin/Tarjeta/Transferencia).
--   - movimientos_caja.metodo_pago: cómo se cobró cada movimiento (null = efectivo).
--   - cajas.total_efectivo / cajas.total_digital: totales por tipo al cerrar.
-- Idempotente: se puede correr varias veces sin error.

SET @db := DATABASE();

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='movimientos_caja' AND COLUMN_NAME='metodo_pago'),
  'ALTER TABLE movimientos_caja ADD COLUMN metodo_pago varchar(20) DEFAULT NULL AFTER motivo',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='cajas' AND COLUMN_NAME='total_efectivo'),
  'ALTER TABLE cajas ADD COLUMN total_efectivo decimal(10,2) DEFAULT NULL AFTER total_neto',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='cajas' AND COLUMN_NAME='total_digital'),
  'ALTER TABLE cajas ADD COLUMN total_digital decimal(10,2) DEFAULT NULL AFTER total_efectivo',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
