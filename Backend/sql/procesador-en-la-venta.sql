-- ============================================================================
-- Quién cobró la venta, aparte de con qué pagó el pasajero.
--
-- `metodo_pago` dice CON QUÉ pagó (TARJETA, YAPE, EFECTIVO...). `procesador`
-- dice A QUIÉN HAY QUE RECLAMARLE esa plata (IZIPAY, MERCADOPAGO). Hasta ahora
-- coincidían —toda TARJETA la cobraba Izipay y todo YAPE, Mercado Pago— y el
-- código lo daba por sentado. En cuanto un segundo proveedor cobre tarjetas,
-- "TARJETA" deja de decir a qué liquidación pertenece la venta.
--
-- Idempotente: se puede correr dos veces sin romper nada.
-- ============================================================================

SET @existe := (SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = 'ventas' AND column_name = 'procesador');

SET @sql := IF(@existe = 0,
  'ALTER TABLE ventas ADD COLUMN procesador VARCHAR(20) NULL AFTER pasarela_referencia',
  'SELECT "ventas.procesador ya existe" AS aviso');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- Relleno de lo ya vendido. Se puede afirmar con certeza porque hasta esta
-- migración el código SOLO permitía esa combinación: la web cobraba TARJETA por
-- Izipay y YAPE por Mercado Pago, y no había otra pasarela. De acá en adelante
-- lo escribe el backend al cobrar, no esta tabla de equivalencias.
--
-- Las ventas de mostrador quedan en NULL a propósito: no pasaron por ninguna
-- pasarela, y poner un proveedor ahí sería inventar un cobro que no existió.
-- Lo mismo las pagadas con saldo: esa plata se cobró al recargar, no acá.
UPDATE ventas
   SET procesador = 'IZIPAY'
 WHERE procesador IS NULL AND canal = 'WEB' AND metodo_pago = 'TARJETA';

UPDATE ventas
   SET procesador = 'MERCADOPAGO'
 WHERE procesador IS NULL AND canal = 'WEB' AND metodo_pago = 'YAPE';

-- Para mirar cómo quedó:
SELECT canal, metodo_pago, procesador, COUNT(*) AS cuantas
  FROM ventas
 GROUP BY canal, metodo_pago, procesador
 ORDER BY canal, metodo_pago;
