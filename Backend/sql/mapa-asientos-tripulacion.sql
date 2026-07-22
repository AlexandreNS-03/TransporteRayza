-- Mapa de asientos configurable + tripulación por embarcación
--
--   mysql -h <host> -P <port> -u <user> -p <db> < Backend/sql/mapa-asientos-tripulacion.sql
--
-- Se puede ejecutar las veces que haga falta: cada paso comprueba primero si
-- ya está aplicado, así que volver a correrlo no da error ni pierde datos.

-- Posición del VIP (PROA/POPA) y capitán.
-- MySQL no tiene ADD COLUMN IF NOT EXISTS, así que se consulta primero.
SET @s = IF((SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'embarcaciones'
               AND column_name = 'vip_posicion') = 0,
            'ALTER TABLE embarcaciones ADD COLUMN vip_posicion VARCHAR(10) NULL DEFAULT ''POPA''',
            'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'embarcaciones'
               AND column_name = 'capitan') = 0,
            'ALTER TABLE embarcaciones ADD COLUMN capitan VARCHAR(150) NULL',
            'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- Tripulantes de cada embarcación (nombre + cargo)
CREATE TABLE IF NOT EXISTS embarcacion_tripulantes (
    id             VARCHAR(36) PRIMARY KEY,
    embarcacion_id VARCHAR(36) NOT NULL,
    nombre         VARCHAR(150) NOT NULL,
    cargo          VARCHAR(60),
    KEY idx_tripulante_embarcacion (embarcacion_id),
    CONSTRAINT fk_tripulante_embarcacion FOREIGN KEY (embarcacion_id)
        REFERENCES embarcaciones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cualquier embarcación sin posición definida se asume con el VIP atrás
UPDATE embarcaciones SET vip_posicion = 'POPA' WHERE vip_posicion IS NULL OR vip_posicion = '';

-- Renumerar los asientos en orden físico: se cuenta desde la proa hacia la popa,
-- así que la sección que va adelante se queda con los primeros números.
-- Es seguro: viaje_asientos_estado guarda su propia copia de número y tipo,
-- por lo que los viajes ya creados no se ven afectados.
DELETE FROM embarcacion_asientos;

INSERT INTO embarcacion_asientos (id, embarcacion_id, numero, tipo)
WITH RECURSIVE nums AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM nums
    WHERE n < (SELECT MAX(COALESCE(cantidad_vip,0) + COALESCE(cantidad_normal,0)) FROM embarcaciones)
)
SELECT UUID(), e.id, nums.n,
       CASE WHEN e.vip_posicion = 'PROA'
            THEN IF(nums.n <= e.cantidad_vip,    'VIP',    'NORMAL')
            ELSE IF(nums.n <= e.cantidad_normal, 'NORMAL', 'VIP')
       END
FROM embarcaciones e
JOIN nums ON nums.n <= (COALESCE(e.cantidad_vip,0) + COALESCE(e.cantidad_normal,0));
