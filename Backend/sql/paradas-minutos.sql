-- ============================================================================
-- Hora estimada de paso por cada parada
--
--   mysql -h <host> -P <puerto> -u <usuario> -p <base> < Backend/sql/paradas-minutos.sql
--
-- Se puede ejecutar las veces que haga falta.
--
-- Se guardan MINUTOS desde la salida, no una hora fija: la misma ruta se opera a
-- las 08:00 y a las 20:00, y con minutos ambos viajes calculan bien su itinerario.
-- ============================================================================

SET @s = IF((SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'ruta_paradas'
               AND column_name = 'minutos_desde_salida') = 0,
            'ALTER TABLE ruta_paradas ADD COLUMN minutos_desde_salida INT NULL',
            'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'viaje_paradas'
               AND column_name = 'minutos_desde_salida') = 0,
            'ALTER TABLE viaje_paradas ADD COLUMN minutos_desde_salida INT NULL',
            'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- La primera parada es el puerto de salida: 0 minutos
UPDATE ruta_paradas SET minutos_desde_salida = 0 WHERE orden = 1 AND minutos_desde_salida IS NULL;
