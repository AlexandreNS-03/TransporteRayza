-- ============================================================================
-- Paradas completas de las dos rutas, incluyendo los puertos terminales
--
--   mysql -h <host> -P <puerto> -u <usuario> -p <base> < Backend/sql/paradas-rutas-completas.sql
--
-- Se puede ejecutar las veces que haga falta: reemplaza las paradas por la lista
-- correcta, no acumula.
--
-- POR QUÉ: Requena→Iquitos no tenía a Requena ni a Iquitos entre sus paradas, así
-- que no se podía vender ningún tramo que empezara o terminara en los puertos
-- principales. Y la vuelta Iquitos→Requena tenía una sola parada, con lo cual no
-- se le podía vender absolutamente nada.
--
-- OJO: esto cambia la numeración de las paradas de la RUTA (la plantilla). Los
-- viajes ya creados conservan su propia copia en viaje_paradas, que es lo que
-- protege a los pasajes ya vendidos: sus tramos siguen apuntando a las paradas
-- con que se vendieron.
-- ============================================================================

-- 1) Requena → Iquitos (aguas abajo)
DELETE FROM ruta_paradas WHERE ruta_id = 'rut_req_iqu';
INSERT INTO ruta_paradas (id, ruta_id, nombre, orden) VALUES
    (UUID(), 'rut_req_iqu', 'Requena',    1),
    (UUID(), 'rut_req_iqu', 'Herrera',    2),
    (UUID(), 'rut_req_iqu', 'Puerto Sol', 3),
    (UUID(), 'rut_req_iqu', 'Saquena',    4),
    (UUID(), 'rut_req_iqu', 'Clavero',    5),
    (UUID(), 'rut_req_iqu', 'Nauta',      6),
    (UUID(), 'rut_req_iqu', 'Iquitos',    7);

-- 2) Iquitos → Requena (aguas arriba, el mismo recorrido al revés)
DELETE FROM ruta_paradas WHERE ruta_id = 'rut_iqu_req';
INSERT INTO ruta_paradas (id, ruta_id, nombre, orden) VALUES
    (UUID(), 'rut_iqu_req', 'Iquitos',    1),
    (UUID(), 'rut_iqu_req', 'Nauta',      2),
    (UUID(), 'rut_iqu_req', 'Clavero',    3),
    (UUID(), 'rut_iqu_req', 'Saquena',    4),
    (UUID(), 'rut_iqu_req', 'Puerto Sol', 5),
    (UUID(), 'rut_iqu_req', 'Herrera',    6),
    (UUID(), 'rut_iqu_req', 'Requena',    7);

-- 3) La tarifa del recorrido completo de Requena→Iquitos apuntaba al tramo 1→5,
--    que con la numeración vieja era Herrera→Nauta. Ahora el recorrido completo
--    es 1→7, así que se corrige para que siga significando lo mismo.
UPDATE ruta_tarifas_tramo
   SET orden_origen = 1, orden_destino = 7
 WHERE ruta_id = 'rut_req_iqu' AND orden_origen = 1 AND orden_destino = 5;

-- 4) Refrescar las paradas de los viajes PROGRAMADOS que todavía no vendieron
--    nada, para que ofrezcan las paradas nuevas. Los viajes con pasajes vendidos
--    NO se tocan: renumerarlos cambiaría el tramo de un boleto ya emitido.
DELETE vp FROM viaje_paradas vp
  JOIN viajes v ON v.id = vp.viaje_id
 WHERE v.estado = 'PROGRAMADO'
   AND NOT EXISTS (SELECT 1 FROM ventas ve WHERE ve.viaje_id = v.id);

INSERT INTO viaje_paradas (id, viaje_id, nombre, orden)
SELECT UUID(), v.id, rp.nombre, rp.orden
FROM viajes v
JOIN ruta_paradas rp ON rp.ruta_id = v.ruta_id
WHERE v.estado = 'PROGRAMADO'
  AND NOT EXISTS (SELECT 1 FROM ventas ve WHERE ve.viaje_id = v.id)
  AND NOT EXISTS (SELECT 1 FROM viaje_paradas x WHERE x.viaje_id = v.id AND x.orden = rp.orden);
