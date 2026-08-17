-- ============================================================================
-- Precio de oferta solo para la web: permite bajar el precio que ve y paga
-- el cliente en la compra en línea sin tocar el precio que cobra el
-- mostrador. Es por ruta completa (no por tramo individual).
--
--   mysql -h <host>.proxy.rlwy.net -P <puerto> -u root -p railway < Backend/sql/precio-oferta-web.sql
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

SET @db := DATABASE();

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='rutas' AND COLUMN_NAME='precio_normal_oferta'),
  'ALTER TABLE rutas ADD COLUMN precio_normal_oferta decimal(10,2) DEFAULT NULL AFTER precio_vip',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='rutas' AND COLUMN_NAME='precio_vip_oferta'),
  'ALTER TABLE rutas ADD COLUMN precio_vip_oferta decimal(10,2) DEFAULT NULL AFTER precio_normal_oferta',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='rutas' AND COLUMN_NAME='oferta_activa'),
  'ALTER TABLE rutas ADD COLUMN oferta_activa tinyint(1) NOT NULL DEFAULT 0 AFTER precio_vip_oferta',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
