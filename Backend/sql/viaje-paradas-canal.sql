-- ============================================================================
-- Paradas de los viajes ya creados + canal de las ventas anteriores
--
--   mysql -h <host> -P <puerto> -u <usuario> -p <base> < Backend/sql/viaje-paradas-canal.sql
--
-- Se puede ejecutar las veces que haga falta: no duplica ni pisa nada.
-- ============================================================================

-- 1) Copiar a cada viaje las paradas de su ruta.
--    Hasta ahora `crearViaje` no las copiaba, así que viaje_paradas quedó vacía y
--    la búsqueda pública caía en un respaldo que vendía el recorrido completo
--    como tramo 1→2. Solo se insertan las que faltan.
INSERT INTO viaje_paradas (id, viaje_id, nombre, orden)
SELECT UUID(), v.id, rp.nombre, rp.orden
FROM viajes v
JOIN ruta_paradas rp ON rp.ruta_id = v.ruta_id
LEFT JOIN viaje_paradas vp ON vp.viaje_id = v.id AND vp.orden = rp.orden
WHERE vp.id IS NULL;

-- 2) Las ventas anteriores a la web son todas de mostrador.
UPDATE ventas SET canal = 'MOSTRADOR' WHERE canal IS NULL OR canal = '';
