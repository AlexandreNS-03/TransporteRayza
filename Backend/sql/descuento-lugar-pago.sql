-- Descuento en la venta de mostrador + lugar de pago (caja por lugar).
--   - precio_original: la tarifa antes de rebajar (para reportes; NO sale en el ticket).
--   - descuento: cuánto se rebajó (precio_original - precio). 0 si no hubo.
--   - lugar_pago: dónde se cobró (IQUITOS / REQUENA), para separar el efectivo.
-- Idempotente: se puede correr varias veces sin error.

SET @db := DATABASE();

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ventas' AND COLUMN_NAME='precio_original'),
  'ALTER TABLE ventas ADD COLUMN precio_original decimal(10,2) DEFAULT NULL AFTER precio',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ventas' AND COLUMN_NAME='descuento'),
  'ALTER TABLE ventas ADD COLUMN descuento decimal(10,2) DEFAULT 0.00 AFTER precio_original',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ventas' AND COLUMN_NAME='lugar_pago'),
  'ALTER TABLE ventas ADD COLUMN lugar_pago varchar(30) DEFAULT NULL AFTER descuento',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- metodo_pago: cómo pagó (EFECTIVO / YAPE / PLIN / TARJETA / TRANSFERENCIA),
-- para separar en reportes el efectivo del digital por oficina.
SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ventas' AND COLUMN_NAME='metodo_pago'),
  'ALTER TABLE ventas ADD COLUMN metodo_pago varchar(20) DEFAULT NULL AFTER lugar_pago',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
