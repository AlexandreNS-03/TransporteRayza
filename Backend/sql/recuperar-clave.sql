-- ============================================================================
-- "Olvidé mi contraseña" para los clientes de la web.
--
--   mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway < Backend/sql/recuperar-clave.sql
--
-- Se guarda el HASH del token, nunca el token en claro: si alguien llegara a
-- leer esta tabla, no podría armar los enlaces y entrar a las cuentas. El token
-- real solo existe en el correo de su dueño.
--
-- Los tokens usados o vencidos se pueden borrar cuando se quiera; quedan por si
-- hace falta revisar quién pidió qué.
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

CREATE TABLE IF NOT EXISTS tokens_recuperacion (
  id          VARCHAR(36) NOT NULL PRIMARY KEY,
  token_hash  VARCHAR(64) NOT NULL,
  cuenta_id   VARCHAR(36) NOT NULL,
  tipo_cuenta VARCHAR(20) NOT NULL,
  expira_at   DATETIME    NOT NULL,
  usado_at    DATETIME,
  created_at  DATETIME    NOT NULL,
  UNIQUE KEY uq_token_hash (token_hash),
  KEY idx_token_cuenta (cuenta_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT COUNT(*) AS enlaces_activos
  FROM tokens_recuperacion
 WHERE usado_at IS NULL AND expira_at > NOW();
