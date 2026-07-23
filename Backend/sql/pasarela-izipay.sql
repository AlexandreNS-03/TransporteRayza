-- ============================================================================
-- Cambio de pasarela: Culqi → Izipay
--
--   mysql -h <host> -P <puerto> -u <usuario> -p <base> < Backend/sql/pasarela-izipay.sql
--
-- Se puede ejecutar las veces que haga falta.
--
-- La columna guardaba el id del cargo en Culqi; ahora guarda la referencia de la
-- transacción en Izipay, así que se renombra a un nombre que no ate el esquema a
-- una pasarela concreta. Los datos que hubiera se conservan.
-- ============================================================================

SET @s = IF((SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'ventas'
               AND column_name = 'culqi_charge_id') = 1
        AND (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'ventas'
               AND column_name = 'pasarela_referencia') = 0,
            'ALTER TABLE ventas CHANGE COLUMN culqi_charge_id pasarela_referencia varchar(100) DEFAULT NULL',
            'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- Por si la base es nueva y nunca tuvo la columna de Culqi
SET @s = IF((SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'ventas'
               AND column_name = 'pasarela_referencia') = 0,
            'ALTER TABLE ventas ADD COLUMN pasarela_referencia varchar(100) DEFAULT NULL',
            'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
