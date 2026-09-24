-- ============================================================================
-- Power BI: vistas de lectura y un usuario que solo puede mirar.
--
-- CÓMO EJECUTARLO
--
--   Opción A (la recomendada) — desde tu máquina, parado en el repo. Necesitas
--   el host y el puerto públicos de la base: están en Railway, en el servicio
--   MySQL, pestaña Variables (MYSQL_PUBLIC_URL). El -p va solo, sin la clave
--   pegada: así la pide por teclado y no queda en el historial del shell.
--
--       mysql -h <host-publico> -P <puerto> -u root -p railway < Backend/sql/power-bi.sql
--
--   Opción B — desde la consola del contenedor de MySQL en Railway. OJO: ese
--   contenedor NO tiene el repo, así que "< Backend/sql/power-bi.sql" falla con
--   "No such file or directory". Hay que pegar el contenido de este archivo
--   dentro de un heredoc, y el delimitador va entre comillas simples o bash se
--   come los backticks y los paréntesis:
--
--       mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway <<'SQL'
--       ... acá va pegado todo este archivo ...
--       SQL
--
-- La idea: Power BI NO se conecta a las tablas, se conecta a estas vistas.
-- Dos razones, y las dos importan.
--
--   1. Los reportes no dependen de entender el esquema. La vista ya trae la
--      sucursal, la ruta, el tipo de asiento y el canal en la misma fila; sin
--      eso, cada gráfico empieza por rehacer los mismos cruces.
--   2. Nada personal sale de acá. Las vistas no exponen documento, correo ni
--      teléfono de ningún pasajero: para medir cuánto se vendió y qué tan
--      llenos van los botes, eso no hace falta. Los nombres solo aparecen donde
--      son la operación misma (quién atendió, quién ganó un sorteo).
--
-- Se puede ejecutar las veces que haga falta.
--
-- OJO: la contraseña del final es un marcador. No la escribas en este archivo:
-- el repositorio es público. Ver la nota que está junto al CREATE USER.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────── Pasajes
-- Una fila por pasaje vendido. Es la base de casi todo: ingresos, ocupación,
-- métodos de pago, canal y quién atendió.
CREATE OR REPLACE VIEW bi_pasajes AS
SELECT
    v.id                                   AS venta_id,
    v.fecha_venta                          AS fecha_venta,
    vi.fecha_salida                        AS fecha_viaje,
    vi.hora_salida                         AS hora_viaje,
    vi.codigo_viaje                        AS viaje,
    COALESCE(vi.sucursal_nombre, 'Sin sucursal')   AS sucursal,
    COALESCE(vi.ruta_nombre, v.viaje_descripcion)  AS ruta,
    vi.embarcacion_nombre                  AS embarcacion,
    v.parada_origen                        AS sube_en,
    v.parada_destino                       AS baja_en,
    v.asiento_tipo                         AS tipo_asiento,
    v.asiento_numero                       AS asiento,
    COALESCE(v.canal, 'MOSTRADOR')         AS canal,
    v.metodo_pago                          AS metodo_pago,
    v.lugar_pago                           AS lugar_pago,
    v.tipo_comprobante                     AS tipo_comprobante,
    v.precio                               AS precio_cobrado,
    v.precio_original                      AS precio_lista,
    COALESCE(v.descuento, 0)               AS descuento,
    v.estado                               AS estado,
    (v.estado = 'ANULADO')                 AS anulada,
    (v.embarque_estado = 'EMBARCADO')      AS embarco,
    v.usuario_nombre                       AS vendio,
    v.created_at                           AS registrada_en
FROM ventas v
LEFT JOIN viajes vi ON vi.id = v.viaje_id;

-- ─────────────────────────────────────────────────────────────── Viajes
-- Un viaje por fila, con cuánto se vendió y qué tan lleno fue. La ocupación es
-- sobre los asientos de la embarcación: es la pregunta que se hace siempre.
CREATE OR REPLACE VIEW bi_viajes AS
SELECT
    vi.id                                  AS viaje_id,
    vi.codigo_viaje                        AS viaje,
    vi.fecha_salida                        AS fecha_salida,
    vi.hora_salida                         AS hora_salida,
    COALESCE(vi.sucursal_nombre, 'Sin sucursal') AS sucursal,
    vi.ruta_nombre                         AS ruta,
    vi.origen                              AS origen,
    vi.destino                             AS destino,
    vi.embarcacion_nombre                  AS embarcacion,
    e.capacidad_total                      AS capacidad,
    vi.estado                              AS estado,
    vi.motivo_cancelacion                  AS motivo_cancelacion,
    COUNT(CASE WHEN v.estado <> 'ANULADO' THEN 1 END)                      AS pasajes_vendidos,
    COUNT(CASE WHEN v.embarque_estado = 'EMBARCADO' THEN 1 END)            AS pasajeros_embarcados,
    COALESCE(SUM(CASE WHEN v.estado <> 'ANULADO' THEN v.precio END), 0)    AS ingreso,
    ROUND(COUNT(CASE WHEN v.estado <> 'ANULADO' THEN 1 END)
          / NULLIF(e.capacidad_total, 0) * 100, 1)                         AS ocupacion_pct
FROM viajes vi
LEFT JOIN embarcaciones e ON e.id = vi.embarcacion_id
LEFT JOIN ventas v        ON v.viaje_id = vi.id
GROUP BY vi.id, e.capacidad_total;

-- ─────────────────────────────────────────────────────────────── Caja
-- Cada turno con su diferencia. Es lo que se mira para saber si un mostrador
-- cuadra o no, sin tener que abrir el sistema.
CREATE OR REPLACE VIEW bi_caja AS
SELECT
    c.id                                   AS caja_id,
    c.fecha_apertura                       AS fecha,
    COALESCE(c.sucursal_nombre, 'Sin sucursal') AS sucursal,
    c.usuario_nombre                       AS responsable,
    c.usuario_rol                          AS rol,
    c.monto_inicial                        AS monto_inicial,
    c.total_ventas                         AS total_ventas,
    c.total_efectivo                       AS total_efectivo,
    c.total_digital                        AS total_digital,
    c.total_anulaciones                    AS total_anulaciones,
    c.monto_cierre                         AS contado_al_cierre,
    c.diferencia                           AS diferencia,
    c.estado                               AS estado,
    c.cerrada_at                           AS cerrada_en
FROM cajas c;

-- ─────────────────────────────────────────────────────────────── Gastos
CREATE OR REPLACE VIEW bi_gastos AS
SELECT
    g.id                                   AS gasto_id,
    g.fecha                                AS fecha,
    COALESCE(g.sucursal_nombre, 'Sin sucursal') AS sucursal,
    g.categoria                            AS categoria,
    g.descripcion                          AS descripcion,
    g.monto                                AS monto,
    g.responsable_nombre                   AS responsable
FROM gastos g;

-- ─────────────────────────────────────────────────────────────── Encomiendas
-- Sin documentos ni teléfonos: para medir el negocio alcanza con el flujo.
CREATE OR REPLACE VIEW bi_encomiendas AS
SELECT
    en.id                                  AS encomienda_id,
    en.codigo_encomienda                   AS codigo,
    en.fecha_registro                      AS fecha,
    COALESCE(en.sucursal_origen_nombre, 'Sin sucursal')  AS sucursal_origen,
    COALESCE(en.sucursal_destino_nombre, 'Sin destino')  AS sucursal_destino,
    en.parada_destino                      AS entrega_en,
    en.peso                                AS peso_kg,
    en.precio                              AS precio,
    en.estado                              AS estado,
    en.estado_pago                         AS estado_pago,
    en.usuario_nombre                      AS registro,
    en.entregado_at                        AS entregada_en
FROM encomiendas en;

-- ─────────────────────────────────────────────────────────────── Auditoría
-- Para tableros de control: quién hizo qué y desde dónde.
CREATE OR REPLACE VIEW bi_auditoria AS
SELECT
    a.created_at                           AS fecha_hora,
    a.usuario_nombre                       AS usuario,
    a.usuario_rol                          AS rol,
    a.modulo                               AS modulo,
    a.accion                               AS accion,
    a.descripcion                          AS detalle,
    a.ip_origen                            AS equipo
FROM auditoria a;

-- ═══════════════════════════════════════════════════ El usuario de Power BI
-- Solo lee, y solo estas vistas: no ve las tablas, ni la de usuarios con sus
-- contraseñas. Si el archivo .pbix se filtra, lo único que se filtra con él es
-- la capacidad de mirar estos números.
--
-- LA CLAVE NO VA ACÁ. Este repositorio es público: cualquier clave escrita en
-- este archivo queda publicada, y sigue publicada en el historial de git
-- aunque después se cambie. La base de Railway se alcanza desde internet.
--
-- Poné la clave al ejecutar, de una de estas dos formas:
--
--   a) Editás esta línea en tu copia local, ejecutás, y descartás el cambio
--      sin subirlo:  git checkout Backend/sql/power-bi.sql
--
--   b) Ejecutás el script tal cual y después, en la consola de Railway:
--          ALTER USER 'powerbi'@'%' IDENTIFIED BY '<la clave de verdad>';
--
-- Para generar una:  openssl rand -base64 24

CREATE USER IF NOT EXISTS 'powerbi'@'%' IDENTIFIED BY 'PONER-LA-CLAVE-AL-EJECUTAR';

-- CREATE USER IF NOT EXISTS no toca la clave si el usuario ya existía, así que
-- volver a correr el script con otra clave no hacía nada. Con este ALTER, la
-- clave queda siempre en la que se escribió arriba —y rotarla es volver a
-- ejecutar el script.
ALTER USER 'powerbi'@'%' IDENTIFIED BY 'PONER-LA-CLAVE-AL-EJECUTAR';

-- Uno por vista: MySQL no acepta comodines en el nombre de tabla, y además así
-- queda a la vista exactamente qué puede leer este usuario.
GRANT SELECT ON railway.bi_pasajes     TO 'powerbi'@'%';
GRANT SELECT ON railway.bi_viajes      TO 'powerbi'@'%';
GRANT SELECT ON railway.bi_caja        TO 'powerbi'@'%';
GRANT SELECT ON railway.bi_gastos      TO 'powerbi'@'%';
GRANT SELECT ON railway.bi_encomiendas TO 'powerbi'@'%';
GRANT SELECT ON railway.bi_auditoria   TO 'powerbi'@'%';
FLUSH PRIVILEGES;

-- Si más adelante se agrega una vista bi_*, hay que darle permiso también:
-- sin GRANT, Power BI simplemente no la ve.

SELECT 'listo: vistas creadas y usuario powerbi con permiso de solo lectura' AS resultado;
