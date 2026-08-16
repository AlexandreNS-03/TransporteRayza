-- ============================================================================
-- Diagnóstico: pasajes reprogramados (antes del fix de reprogramar-asiento-
-- no-ocupado) cuyo asiento en el viaje nuevo nunca quedó marcado como
-- ocupado. Puramente de lectura, no modifica nada.
--
--   mysql -h <host>.proxy.rlwy.net -P <puerto> -u root -p railway < Backend/sql/diagnostico-reprogramados-sin-asiento.sql
--
-- Cada fila es una venta reprogramada afectada. La columna `conflicto` dice
-- si ese mismo asiento/tramo ya se le vendió a otra persona mientras estuvo
-- "libre" por error — esos casos NO se pueden reparar solo con un script,
-- hay que decidir a mano qué pasajero se queda con el asiento.
-- ============================================================================

SELECT
  v.id                                   AS venta_id,
  v.pasajero_nombre,
  v.viaje_codigo,
  v.asiento_numero,
  v.parada_origen,
  v.parada_destino,
  v.orden_origen,
  v.orden_destino,
  ae.id                                  AS viaje_asiento_estado_id,
  ae.estado                              AS estado_asiento_actual,
  ae.venta_id                            AS venta_id_actual_en_asiento,
  (SELECT COUNT(*) FROM viaje_asiento_tramos_ocupados t
     WHERE t.viaje_asiento_estado_id = ae.id
       AND CAST(t.tramo AS UNSIGNED) >= v.orden_origen
       AND CAST(t.tramo AS UNSIGNED) < v.orden_destino)   AS tramos_ya_ocupados,
  (v.orden_destino - v.orden_origen)     AS tramos_esperados,
  CASE
    WHEN ae.venta_id IS NOT NULL AND ae.venta_id <> v.id THEN 'SI — otro pasajero ya tiene ese asiento/tramo'
    WHEN (SELECT COUNT(*) FROM ventas v2
            WHERE v2.viaje_id = v.viaje_id AND v2.asiento_numero = v.asiento_numero
              AND v2.resolucion = 'REPROGRAMADO' AND v2.estado <> 'ANULADO'
              AND v2.orden_origen < v.orden_destino AND v2.orden_destino > v.orden_origen
              AND v2.id <> v.id) > 0
      THEN 'SI — otra reprogramación quedó en el mismo asiento/tramo'
    ELSE 'no'
  END AS conflicto
FROM ventas v
JOIN viaje_asientos_estado ae
  ON ae.viaje_id = v.viaje_id AND ae.numero = v.asiento_numero
WHERE v.resolucion = 'REPROGRAMADO'
  AND v.estado <> 'ANULADO'
  AND (SELECT COUNT(*) FROM viaje_asiento_tramos_ocupados t
         WHERE t.viaje_asiento_estado_id = ae.id
           AND CAST(t.tramo AS UNSIGNED) >= v.orden_origen
           AND CAST(t.tramo AS UNSIGNED) < v.orden_destino) < (v.orden_destino - v.orden_origen)
ORDER BY conflicto DESC, v.created_at;
