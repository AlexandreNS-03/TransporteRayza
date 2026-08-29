-- ============================================================================
-- Segundo factor por correo para el personal del sistema.
--
--   mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway < Backend/sql/doble-factor.sql
--
-- Se guarda el HASH del código, no el código: son 6 dígitos, así que quien
-- pudiera leer esta tabla entraría a cualquier cuenta sin tocar el correo.
--
-- OJO: la columna doble_factor queda en FALSE para todos. Se prende cuenta por
-- cuenta desde el panel. Encenderla para todos de golpe dejaría fuera a
-- cualquiera cuyo correo esté mal escrito o vacío, y en una empresa que vende
-- todos los días eso es peor que el riesgo que evita.
--
-- Para ver quién puede recibir el código antes de prender nada, la última
-- consulta lista los usuarios sin correo registrado.
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

SET @db := DATABASE();

SET @sql := IF(
  NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=@db AND TABLE_NAME='usuarios' AND COLUMN_NAME='doble_factor'),
  'ALTER TABLE usuarios ADD COLUMN doble_factor BOOLEAN NOT NULL DEFAULT FALSE',
  'SELECT ''usuarios.doble_factor ya existe'' AS aviso');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

CREATE TABLE IF NOT EXISTS codigos_verificacion (
  id          VARCHAR(36) NOT NULL PRIMARY KEY,
  usuario_id  VARCHAR(36) NOT NULL,
  codigo_hash VARCHAR(64) NOT NULL,
  expira_at   DATETIME    NOT NULL,
  intentos    INT         NOT NULL DEFAULT 0,
  usado_at    DATETIME,
  created_at  DATETIME    NOT NULL,
  KEY idx_codigo_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Quiénes NO podrían recibir el código: a estos hay que ponerles correo antes
-- de prenderles la verificación, o quedarían sin poder entrar.
SELECT username, nombre, rol,
       CASE WHEN email IS NULL OR email = '' THEN 'SIN CORREO' ELSE email END AS correo,
       doble_factor
  FROM usuarios
 WHERE activo = TRUE
 ORDER BY (email IS NULL OR email = '') DESC, username;
