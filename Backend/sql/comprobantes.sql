-- Tabla de comprobantes electrónicos (formato Nubefact)
-- Ejecutar en la base de datos: transportes_rayza

CREATE TABLE IF NOT EXISTS comprobantes (
    id                          VARCHAR(36)  PRIMARY KEY,
    venta_id                    VARCHAR(36)  NOT NULL,
    tipo_de_comprobante         VARCHAR(10)  NOT NULL,           -- FACTURA | BOLETA
    serie                       VARCHAR(10)  NOT NULL,           -- F001 | B001
    numero                      BIGINT       NOT NULL,
    cliente_tipo_de_documento   VARCHAR(2),                      -- 1=DNI, 4=CE, 6=RUC, 7=PASAPORTE
    cliente_numero_de_documento VARCHAR(20),
    cliente_denominacion        VARCHAR(200),
    cliente_direccion           VARCHAR(200),
    cliente_email               VARCHAR(100),
    fecha_de_emision            DATE,
    moneda                      INT          DEFAULT 1,          -- 1 = PEN
    porcentaje_de_igv           DECIMAL(5,2) DEFAULT 18.00,
    total_exonerada             DECIMAL(10,2),                   -- operacion exonerada de IGV (Ley 27037 Amazonia)
    total_igv                   DECIMAL(10,2),                   -- siempre 0.00 (exonerado)
    total                       DECIMAL(10,2),
    descripcion                 TEXT,
    estado                      VARCHAR(15)  NOT NULL,           -- ACEPTADO | ANULADO
    motivo_anulacion            TEXT,
    anulado_at                  DATETIME,
    enlace_pdf                  VARCHAR(300),
    respuesta_nubefact          TEXT,
    usuario_nombre              VARCHAR(150),
    created_at                  DATETIME,
    UNIQUE KEY uk_comprobante_serie_numero (serie, numero),
    KEY idx_comprobante_venta (venta_id),
    CONSTRAINT fk_comprobante_venta FOREIGN KEY (venta_id) REFERENCES ventas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
