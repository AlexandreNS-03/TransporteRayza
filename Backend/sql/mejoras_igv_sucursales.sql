-- Mejoras 2026-07-17
-- 1) Comprobantes exonerados de IGV (Ley 27037 - Amazonía): el monto es fijo, sin IGV
-- 2) Usuarios asignados a una sucursal (Requena / Iquitos) para venta por sucursal
-- 3) Candado a nivel de BD contra doble venta del mismo asiento/tramo

-- 1) La columna total_gravada pasa a ser total_exonerada (operación exonerada de IGV)
ALTER TABLE comprobantes CHANGE total_gravada total_exonerada DECIMAL(10,2);

-- 2) Sucursal del usuario (NULL = todas, p.ej. administradores)
-- Nota: sucursal_id ya existia en el esquema; solo se agrega el nombre desnormalizado
ALTER TABLE usuarios
    ADD COLUMN sucursal_nombre VARCHAR(100) NULL;

-- 3) Un asiento no puede tener el mismo tramo ocupado dos veces (protección ante ventas simultáneas)
ALTER TABLE viaje_asiento_tramos_ocupados
    ADD UNIQUE KEY uk_asiento_tramo (viaje_asiento_estado_id, tramo);

-- 4) Notas de crédito: el tipo admite NOTA_CREDITO y se guarda la referencia al comprobante que modifica
ALTER TABLE comprobantes MODIFY tipo_de_comprobante VARCHAR(15) NOT NULL;
ALTER TABLE comprobantes ADD COLUMN ref_serie VARCHAR(10) NULL, ADD COLUMN ref_numero BIGINT NULL;

-- 5) Módulo caja: las horas se guardan como TIME (eran varchar y truncaban el valor)
ALTER TABLE cajas MODIFY hora_apertura TIME NOT NULL;
ALTER TABLE movimientos_caja MODIFY hora TIME NOT NULL;

-- 6) El correlativo es por tipo+serie (en modo demo de Nubefact las notas de credito comparten serie con boletas/facturas)
ALTER TABLE comprobantes DROP INDEX uk_comprobante_serie_numero;
ALTER TABLE comprobantes ADD UNIQUE KEY uk_comprobante_tipo_serie_numero (tipo_de_comprobante, serie, numero);

-- 7) Encomiendas con comprobante: el comprobante puede referenciar una venta O una encomienda
ALTER TABLE comprobantes MODIFY venta_id VARCHAR(36) NULL;
ALTER TABLE comprobantes ADD COLUMN encomienda_id VARCHAR(36) NULL;
ALTER TABLE comprobantes ADD CONSTRAINT fk_comprobante_encomienda FOREIGN KEY (encomienda_id) REFERENCES encomiendas(id);
