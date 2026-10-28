-- ============================================================================
-- El código de pasajero frecuente: RZ-7K3M9Q.
--
--   mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway <<'SQL'
--   ... pegar acá el contenido ...
--   SQL
--
-- Sirve para que en el mostrador la persona diga un código corto en vez de
-- deletrear su documento.
--
-- Se asigna solo, la primera vez que cada cliente entra a su cuenta: así lo
-- tienen también las cuentas que ya existen, sin recorrer la tabla acá.
--
-- El alfabeto del código no tiene O, 0, I, 1 ni L: esto se dicta en voz alta a
-- través de una ventanilla, a veces con el motor de una lancha al lado.
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

SET @hay := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes'
               AND COLUMN_NAME = 'codigo_pasajero');
SET @sql := IF(@hay = 0,
  'ALTER TABLE `clientes` ADD COLUMN `codigo_pasajero` VARCHAR(12) NULL COMMENT ''Codigo de pasajero frecuente, tipo RZ-7K3M9Q''',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Única, aceptando NULL: los que todavía no entraron no tienen código, y en
-- MySQL varios NULL no chocan entre sí.
SET @hay := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes'
               AND INDEX_NAME = 'uk_cliente_codigo_pasajero');
SET @sql := IF(@hay = 0,
  'ALTER TABLE `clientes` ADD UNIQUE KEY `uk_cliente_codigo_pasajero` (`codigo_pasajero`)',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
