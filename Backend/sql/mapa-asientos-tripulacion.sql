-- Mapa de asientos configurable + tripulación por embarcación

-- Posición del VIP (PROA/POPA) y capitán
ALTER TABLE embarcaciones
    ADD COLUMN vip_posicion VARCHAR(10) NULL DEFAULT 'POPA',
    ADD COLUMN capitan VARCHAR(150) NULL;

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
