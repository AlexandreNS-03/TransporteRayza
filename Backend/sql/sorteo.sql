-- ============================================================================
-- Sorteo promocional: un pasaje gratis entre quienes viajaron.
--
--   mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway < Backend/sql/sorteo.sql
--
-- OJO, ANTES DE USARLO EN PRODUCCIÓN: un sorteo en Perú necesita autorización
-- y bases publicadas (organizador con RUC, premio y su valor, fecha y hora
-- exactas, mecánica). Esto guarda esos datos para mostrarlos, pero el trámite
-- es de la empresa. Sin eso hay riesgo de sanción de INDECOPI.
--
-- El ganador se elige EN EL SERVIDOR y queda guardado con su fecha y con
-- cuántos cupones participaron: es lo que permite demostrar que fue limpio.
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

CREATE TABLE IF NOT EXISTS sorteos (
  id                    VARCHAR(36)  NOT NULL PRIMARY KEY,
  nombre                VARCHAR(150),
  premio                VARCHAR(300),
  premio_valor          DECIMAL(10,2),
  fecha_sorteo          DATETIME,
  bases_url             VARCHAR(300),
  estado                VARCHAR(20)  NOT NULL,
  cupon_ganador_id      VARCHAR(36),
  sorteado_at           DATETIME,
  sorteado_por          VARCHAR(100),
  cupones_participantes INT,
  created_at            DATETIME,
  KEY idx_sorteo_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cupones_sorteo (
  id                 VARCHAR(36) NOT NULL PRIMARY KEY,
  sorteo_id          VARCHAR(36) NOT NULL,
  codigo             VARCHAR(20) NOT NULL,
  venta_id           VARCHAR(36),
  pasajero_nombre    VARCHAR(150),
  pasajero_documento VARCHAR(20),
  peso               INT         NOT NULL DEFAULT 1,
  registrado_at      DATETIME,
  email              VARCHAR(150),
  telefono           VARCHAR(30),
  created_at         DATETIME,
  UNIQUE KEY uq_cupon_codigo (codigo),
  KEY idx_cupon_sorteo (sorteo_id),
  KEY idx_cupon_venta (venta_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT (SELECT COUNT(*) FROM sorteos)        AS sorteos,
       (SELECT COUNT(*) FROM cupones_sorteo) AS cupones;
