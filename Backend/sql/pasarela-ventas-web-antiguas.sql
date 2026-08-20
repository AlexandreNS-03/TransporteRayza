-- ============================================================================
-- Recupera con qué pasarela se pagaron las compras web anteriores al registro
-- del método (hasta 2026-08-19 quedaban con metodo_pago en NULL).
--
-- No hace falta para que esas ventas aparezcan: ya se muestran como
-- "Web · sin registrar" y su monto ya está fuera del efectivo de caja. Esto
-- solo les pone la etiqueta de la pasarela correcta.
--
-- Se deduce del formato de la referencia que guarda cada pasarela:
--   Mercado Pago -> id numérico del pago            (ej. 1349277087)
--   Izipay       -> uuid de la transacción           (ej. 27a1278...bfc09)
--   modo prueba  -> "yape_simulado_" / "izipay_simulado_"
-- Lo que no encaje en ninguno de esos patrones NO se toca: se prefiere dejarlo
-- "sin registrar" antes que atribuirle plata a la pasarela equivocada.
--
--   mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway < pasarela-ventas-web-antiguas.sql
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

-- 1) ANTES: qué se va a cambiar y qué se va a dejar igual.
SELECT
  CASE
    WHEN pasarela_referencia LIKE 'yape_simulado_%'                       THEN 'YAPE (prueba)'
    WHEN pasarela_referencia LIKE 'izipay_simulado_%'                     THEN 'TARJETA (prueba)'
    WHEN pasarela_referencia REGEXP '^[0-9]+$'                            THEN 'YAPE (Mercado Pago)'
    WHEN REPLACE(pasarela_referencia,'-','') REGEXP '^[0-9a-fA-F]{32}$'   THEN 'TARJETA (Izipay)'
    ELSE 'SE DEJA SIN REGISTRAR'
  END AS resultado,
  COUNT(*) AS ventas,
  SUM(precio) AS monto
FROM ventas
WHERE canal = 'WEB' AND estado = 'PAGADO' AND (metodo_pago IS NULL OR metodo_pago = '')
GROUP BY resultado;

-- 2) Mercado Pago: id numérico, o referencia simulada de Yape.
UPDATE ventas
SET metodo_pago = 'YAPE'
WHERE canal = 'WEB' AND estado = 'PAGADO' AND (metodo_pago IS NULL OR metodo_pago = '')
  AND pasarela_referencia IS NOT NULL
  AND (pasarela_referencia LIKE 'yape_simulado_%' OR pasarela_referencia REGEXP '^[0-9]+$');

-- 3) Izipay: uuid de la transacción, o referencia simulada de Izipay.
UPDATE ventas
SET metodo_pago = 'TARJETA'
WHERE canal = 'WEB' AND estado = 'PAGADO' AND (metodo_pago IS NULL OR metodo_pago = '')
  AND pasarela_referencia IS NOT NULL
  AND (pasarela_referencia LIKE 'izipay_simulado_%'
       OR REPLACE(pasarela_referencia,'-','') REGEXP '^[0-9a-fA-F]{32}$');

-- 4) DESPUÉS: cómo quedaron las compras web.
SELECT
  CASE
    WHEN metodo_pago = 'TARJETA' THEN 'Web · Izipay'
    WHEN metodo_pago = 'YAPE'    THEN 'Web · Mercado Pago'
    ELSE 'Web · sin registrar'
  END AS canal_pasarela,
  COUNT(*) AS ventas,
  SUM(precio) AS monto
FROM ventas
WHERE canal = 'WEB' AND estado = 'PAGADO'
GROUP BY canal_pasarela;
