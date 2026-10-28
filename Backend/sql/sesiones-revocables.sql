-- ============================================================================
-- Poder cerrar una sesión de verdad.
--
--   mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway <<'SQL'
--   ... pegar acá el contenido ...
--   SQL
--
-- UN TOKEN FIRMADO NO SE PUEDE BORRAR. Una vez emitido vale hasta que vence
-- —24 horas— y el servidor no tenía forma de desconocerlo. Eso dejaba tres
-- agujeros que cerrar sesión en el navegador NO arregla, porque eso solo borra
-- la copia del que ya se fue:
--
--   * Cambiar la contraseña no echaba a nadie. Si te robaron la cuenta y
--     cambiás la clave, el token del otro seguía andando un día entero.
--   * Desactivar a un empleado no lo sacaba hasta el día siguiente.
--   * Bajarle el rol tampoco: el rol viaja DENTRO del token.
--
-- La solución no es una lista de tokens vivos —habría que limpiarla y un token
-- perdido quedaría dentro— sino una fecha por cuenta: si el token se emitió
-- ANTES de `sesiones_desde`, no sirve. Una columna mata todas las sesiones de
-- alguien de golpe.
--
-- NULL significa "valen todas", que es lo correcto para las cuentas que ya
-- existen: nadie queda afuera al desplegar esto.
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

SET @hay := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios'
               AND COLUMN_NAME = 'sesiones_desde');
SET @sql := IF(@hay = 0,
  'ALTER TABLE `usuarios` ADD COLUMN `sesiones_desde` DATETIME NULL COMMENT ''Un token emitido antes de esta fecha ya no vale; NULL = valen todos''',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @hay := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes'
               AND COLUMN_NAME = 'sesiones_desde');
SET @sql := IF(@hay = 0,
  'ALTER TABLE `clientes` ADD COLUMN `sesiones_desde` DATETIME NULL COMMENT ''Un token emitido antes de esta fecha ya no vale; NULL = valen todos''',
  'DO 0');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
