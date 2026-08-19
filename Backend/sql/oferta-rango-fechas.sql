-- ============================================================================
-- Rango de fechas para el precio de oferta de la web. La oferta pasa a aplicar
-- solo a los viajes que SALEN dentro del rango; fuera de él se cobra el precio
-- normal. Ambas columnas son opcionales: sin fecha, la oferta no tiene ese
-- límite (vacías las dos = se comporta como antes, oferta permanente).
--
--   mysql -h <host>.proxy.rlwy.net -P <puerto> -u root -p railway < Backend/sql/oferta-rango-fechas.sql
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

SET @db := DATABASE();

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='rutas' AND COLUMN_NAME='oferta_desde'),
  'ALTER TABLE rutas ADD COLUMN oferta_desde date DEFAULT NULL AFTER oferta_activa',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='rutas' AND COLUMN_NAME='oferta_hasta'),
  'ALTER TABLE rutas ADD COLUMN oferta_hasta date DEFAULT NULL AFTER oferta_desde',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
