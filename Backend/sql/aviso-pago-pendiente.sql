-- Aviso de reserva pendiente de pago: guarda cuándo se le mandó el correo al
-- cliente que dejó su compra a medias, para no escribirle dos veces por la
-- misma reserva (el aviso puede dispararlo Izipay al abandonar y también el
-- recordatorio automático). Idempotente.

SET @db := DATABASE();

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ventas' AND COLUMN_NAME='aviso_pago_enviado'),
  'ALTER TABLE ventas ADD COLUMN aviso_pago_enviado datetime DEFAULT NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- El recordatorio busca reservas por estado y vencimiento; con este índice no
-- recorre toda la tabla de ventas cada minuto.
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ventas' AND INDEX_NAME='idx_ventas_estado_expira'),
  'CREATE INDEX idx_ventas_estado_expira ON ventas (estado, reserva_expira)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
