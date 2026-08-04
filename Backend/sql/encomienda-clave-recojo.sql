-- Proceso de recojo de encomiendas: clave de seguridad de 4 dígitos + datos de entrega.
--   - clave_seguridad: la fija el remitente al registrar; se valida en el recojo.
--   - receptor_nombre / receptor_documento: quién recogió la encomienda.
--   - entregado_at: cuándo se entregó.
-- Idempotente: se puede correr varias veces sin error.

SET @db := DATABASE();

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='encomiendas' AND COLUMN_NAME='clave_seguridad'),
  'ALTER TABLE encomiendas ADD COLUMN clave_seguridad varchar(10) DEFAULT NULL AFTER observacion',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='encomiendas' AND COLUMN_NAME='receptor_nombre'),
  'ALTER TABLE encomiendas ADD COLUMN receptor_nombre varchar(150) DEFAULT NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='encomiendas' AND COLUMN_NAME='receptor_documento'),
  'ALTER TABLE encomiendas ADD COLUMN receptor_documento varchar(20) DEFAULT NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='encomiendas' AND COLUMN_NAME='entregado_at'),
  'ALTER TABLE encomiendas ADD COLUMN entregado_at datetime DEFAULT NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
