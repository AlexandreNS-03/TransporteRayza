-- Cancelación de viajes: motivo, resolución de cada pasaje afectado y la
-- billetera de saldo a favor del cliente. Idempotente.

SET @db := DATABASE();

-- 1) Viaje: por qué y cuándo se canceló
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='viajes' AND COLUMN_NAME='motivo_cancelacion'),
  'ALTER TABLE viajes ADD COLUMN motivo_cancelacion varchar(300) DEFAULT NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='viajes' AND COLUMN_NAME='cancelado_at'),
  'ALTER TABLE viajes ADD COLUMN cancelado_at datetime DEFAULT NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 2) Venta: qué se hizo con el pasaje de un viaje cancelado
SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ventas' AND COLUMN_NAME='resolucion'),
  'ALTER TABLE ventas ADD COLUMN resolucion varchar(20) DEFAULT NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 3) Billetera: movimientos de saldo a favor por cliente (llave = correo)
CREATE TABLE IF NOT EXISTS `saldo_movimientos` (
  `id` varchar(36) NOT NULL,
  `cliente_email` varchar(100) NOT NULL,
  `cliente_documento` varchar(20) DEFAULT NULL,
  `cliente_nombre` varchar(150) DEFAULT NULL,
  `monto` decimal(10,2) NOT NULL,
  `motivo` varchar(250) DEFAULT NULL,
  `venta_id` varchar(36) DEFAULT NULL,
  `usuario_nombre` varchar(150) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_saldo_email` (`cliente_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
