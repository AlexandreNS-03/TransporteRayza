-- ============================================================================
-- Pre-embarque: la ruta Iquitos → Requena se aborda en dos momentos.
--
-- El pasajero no sube al bote en Iquitos: sube a un carro que lo lleva hasta
-- Nauta, y recién ahí embarca. Son dos controles distintos, en dos lugares y a
-- dos horas distintas, y hasta ahora el sistema solo conocía uno.
--
--   PRE-EMBARQUE  en Iquitos, al carro   → abre 1 hora antes de la salida
--   EMBARQUE      en Nauta,   al bote    → ventana fija de 12:00 a 14:00
--
--   mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway < Backend/sql/preembarque.sql
--
-- El pre-embarque NO se activa por id de ruta sino por una bandera en `rutas`:
-- si mañana otra ruta se aborda igual, se prende la bandera y listo, sin tocar
-- código. Acá solo se prende para Iquitos → Requena; la vuelta queda igual.
--
-- `preembarque_estado` admite NULL a propósito: es lo que queda en las ventas
-- ya existentes y en las rutas que no usan pre-embarque, y se lee como "no
-- aplica". Solo las ventas de una ruta con la bandera prendida lo usan.
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

SET @db := DATABASE();

-- 1. Bandera en la ruta -------------------------------------------------------

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='rutas' AND COLUMN_NAME='requiere_preembarque'),
  'ALTER TABLE rutas ADD COLUMN requiere_preembarque BOOLEAN NOT NULL DEFAULT FALSE',
  'SELECT ''rutas.requiere_preembarque ya existe'' AS aviso');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- 2. Estado del pre-embarque en la venta --------------------------------------

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ventas' AND COLUMN_NAME='preembarque_estado'),
  'ALTER TABLE ventas ADD COLUMN preembarque_estado VARCHAR(20) NULL',
  'SELECT ''ventas.preembarque_estado ya existe'' AS aviso');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ventas' AND COLUMN_NAME='preembarcado_at'),
  'ALTER TABLE ventas ADD COLUMN preembarcado_at DATETIME NULL',
  'SELECT ''ventas.preembarcado_at ya existe'' AS aviso');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='ventas' AND COLUMN_NAME='preembarcado_por'),
  'ALTER TABLE ventas ADD COLUMN preembarcado_por VARCHAR(100) NULL',
  'SELECT ''ventas.preembarcado_por ya existe'' AS aviso');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- 3. Prender la bandera solo en la ida ----------------------------------------
-- Se busca por origen y destino y no por id, para que funcione igual si la
-- ruta fue recreada con otro id. La vuelta (Requena → Iquitos) no se toca.

UPDATE rutas
   SET requiere_preembarque = TRUE
 WHERE TRIM(LOWER(origen))  = 'iquitos'
   AND TRIM(LOWER(destino)) = 'requena';

SELECT id, origen, destino, requiere_preembarque
  FROM rutas
 ORDER BY requiere_preembarque DESC, origen;
