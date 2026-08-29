-- ============================================================================
-- Libro de Reclamaciones virtual (INDECOPI, D.S. 011-2011-PCM).
--
-- Todo comercio abierto al público —incluidas las páginas web— está obligado a
-- tener uno. Los campos salen de la norma: número correlativo, fecha, datos del
-- consumidor (y de su apoderado si es menor de edad), identificación del bien o
-- servicio, el detalle, y un espacio para las acciones del proveedor.
--
--   mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway < Backend/sql/libro-reclamaciones.sql
--
-- OJO: estas filas NO se borran. La norma obliga a conservarlas por lo menos
-- dos años, y son la prueba ante una fiscalización.
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

CREATE TABLE IF NOT EXISTS reclamaciones (
  id                        VARCHAR(36)   NOT NULL PRIMARY KEY,
  numero                    INT           NOT NULL,
  created_at                DATETIME      NOT NULL,
  tipo                      VARCHAR(10)   NOT NULL,

  consumidor_nombre         VARCHAR(150),
  consumidor_tipo_documento VARCHAR(20),
  consumidor_documento      VARCHAR(20),
  consumidor_domicilio      VARCHAR(250),
  consumidor_email          VARCHAR(150),
  consumidor_telefono       VARCHAR(30),

  menor_de_edad             BOOLEAN       DEFAULT FALSE,
  apoderado_nombre          VARCHAR(150),
  apoderado_documento       VARCHAR(20),

  bien_tipo                 VARCHAR(10),
  bien_descripcion          VARCHAR(500),
  monto_reclamado           DECIMAL(10,2),

  detalle                   TEXT,
  pedido                    TEXT,

  estado                    VARCHAR(20)   NOT NULL,
  respuesta                 TEXT,
  respondido_at             DATETIME,
  respondido_por            VARCHAR(100),

  UNIQUE KEY uq_reclamacion_numero (numero),
  KEY idx_reclamacion_estado (estado),
  KEY idx_reclamacion_fecha (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT COUNT(*) AS hojas_registradas FROM reclamaciones;
