-- Notificación IPN de Izipay: guarda el identificador del pedido enviado a la
-- pasarela para poder ubicar la(s) venta(s) cuando llega el aviso, que solo
-- trae el orderId. Idempotente.

SET @db := DATABASE();

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ventas' AND COLUMN_NAME='orden_pago'),
  'ALTER TABLE ventas ADD COLUMN orden_pago varchar(60) DEFAULT NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ventas' AND INDEX_NAME='idx_ventas_orden_pago'),
  'CREATE INDEX idx_ventas_orden_pago ON ventas (orden_pago)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
