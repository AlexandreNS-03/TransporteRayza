-- ============================================================================
-- Repara los pasajes reprogramados (antes del fix de reprogramar-asiento-
-- no-ocupado, PR #94) cuyo asiento nunca quedó marcado como ocupado en el
-- viaje nuevo.
--
--   mysql -h <host>.proxy.rlwy.net -P <puerto> -u root -p railway < Backend/sql/reparar-reprogramados-sin-asiento.sql
--
-- Corre primero Backend/sql/diagnostico-reprogramados-sin-asiento.sql y
-- revisa la columna `conflicto`. Este script SOLO toca los casos sin
-- conflicto (nadie más tiene ese asiento/tramo todavía): marca el asiento
-- como VENDIDO y registra los tramos que faltaban, dejando el asiento en el
-- mismo estado en que hubiera quedado si el fix ya hubiera existido al
-- reprogramar.
--
-- Los casos CON conflicto (el asiento ya se le vendió a otra persona
-- mientras aparecía libre) NO se tocan: hay que resolverlos a mano, uno por
-- uno, porque el script no puede decidir cuál de los dos pasajeros se queda
-- con el asiento.
--
-- Se puede ejecutar las veces que haga falta: si ya no hay nada roto, no
-- cambia ni una fila.
-- ============================================================================

-- 1) Completar los tramos que faltan (solo donde no hay conflicto)
INSERT INTO viaje_asiento_tramos_ocupados (id, viaje_asiento_estado_id, tramo)
SELECT
  UUID(),
  ae.id,
  numeros.n
FROM ventas v
JOIN viaje_asientos_estado ae
  ON ae.viaje_id = v.viaje_id AND ae.numero = v.asiento_numero
JOIN (
  SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
  UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
  UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
  UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
) numeros ON numeros.n >= v.orden_origen AND numeros.n < v.orden_destino
WHERE v.resolucion = 'REPROGRAMADO'
  AND v.estado <> 'ANULADO'
  AND (ae.venta_id IS NULL OR ae.venta_id = v.id)
  AND NOT EXISTS (
    SELECT 1 FROM viaje_asiento_tramos_ocupados t
    WHERE t.viaje_asiento_estado_id = ae.id AND t.tramo = CAST(numeros.n AS CHAR)
  )
  -- Si otra reprogramación quedó en el mismo asiento/tramo, no se toca: hay
  -- que decidir a mano cuál pasajero se queda con el asiento.
  AND NOT EXISTS (
    SELECT 1 FROM ventas v2
    WHERE v2.viaje_id = v.viaje_id AND v2.asiento_numero = v.asiento_numero
      AND v2.resolucion = 'REPROGRAMADO' AND v2.estado <> 'ANULADO'
      AND v2.orden_origen < v.orden_destino AND v2.orden_destino > v.orden_origen
      AND v2.id <> v.id
  );

-- 2) Marcar el asiento como VENDIDO con el pasajero correcto (solo sin conflicto)
UPDATE viaje_asientos_estado ae
JOIN ventas v
  ON ae.viaje_id = v.viaje_id AND ae.numero = v.asiento_numero
SET
  ae.estado = 'VENDIDO',
  ae.venta_id = v.id,
  ae.pasajero_nombre = v.pasajero_nombre,
  ae.pasajero_doc = v.pasajero_documento,
  ae.pasajero_tel = v.pasajero_telefono
WHERE v.resolucion = 'REPROGRAMADO'
  AND v.estado <> 'ANULADO'
  AND (ae.venta_id IS NULL OR ae.venta_id = v.id)
  AND ae.estado <> 'VENDIDO'
  AND NOT EXISTS (
    SELECT 1 FROM ventas v2
    WHERE v2.viaje_id = v.viaje_id AND v2.asiento_numero = v.asiento_numero
      AND v2.resolucion = 'REPROGRAMADO' AND v2.estado <> 'ANULADO'
      AND v2.orden_origen < v.orden_destino AND v2.orden_destino > v.orden_origen
      AND v2.id <> v.id
  );
