-- ============================================================================
-- Vincula cada movimiento de caja con la venta que lo originó. Permite corregir
-- el método de pago del movimiento cuando se edita el pago de una venta (p. ej.
-- el cliente dijo "pago por Plin" pero al final paga en efectivo en oficina),
-- manteniendo el cuadre de caja (efectivo vs. digital) correcto.
--
--   mysql -h <host>.proxy.rlwy.net -P <puerto> -u root -p railway < Backend/sql/movimiento-caja-venta-id.sql
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

SET @db := DATABASE();

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='movimientos_caja' AND COLUMN_NAME='venta_id'),
  'ALTER TABLE movimientos_caja ADD COLUMN venta_id varchar(36) DEFAULT NULL AFTER motivo',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Índice para buscar rápido el movimiento de una venta al editar su pago.
SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='movimientos_caja' AND INDEX_NAME='idx_mov_caja_venta'),
  'CREATE INDEX idx_mov_caja_venta ON movimientos_caja (venta_id)',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
