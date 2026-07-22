-- ============================================================================
-- Migración Fase 2 — Cuentas de cliente + reserva/pago en línea (Culqi)
-- Ejecutar UNA vez sobre la base de datos existente (local y Railway):
--   mysql -h <host> -P <port> -u <user> -p<pass> <db> < Backend/sql/migracion-fase2-clientes-reservas.sql
-- Si una columna ya existe, MySQL da error 1060: puedes ignorarlo.
-- ============================================================================

-- 1) Tabla de CLIENTES (público) — separada de `usuarios` (personal)
CREATE TABLE IF NOT EXISTS `clientes` (
  `id`                    varchar(36)  NOT NULL,
  `email`                 varchar(120) NOT NULL,
  `password`              varchar(100) NOT NULL,
  `nombres`               varchar(100) DEFAULT NULL,
  `apellidos`             varchar(100) DEFAULT NULL,
  `tipo_documento`        enum('DNI','CE','PASAPORTE') NOT NULL DEFAULT 'DNI',
  `numero_documento`      varchar(20)  DEFAULT NULL,
  `pais_documento`        varchar(2)   DEFAULT 'PE',   -- referencial (ISO-2): PE, CO, BR…
  `fecha_nacimiento`      date         DEFAULT NULL,
  `codigo_pais_telefono`  varchar(6)   DEFAULT '+51',
  `telefono`              varchar(20)  DEFAULT NULL,
  `activo`                tinyint(1)   NOT NULL DEFAULT 1,
  `created_at`            datetime     DEFAULT NULL,
  `ultimo_login`          datetime     DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_clientes_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Nuevo estado RESERVADO (son ENUM de MySQL → hace falta ALTER)
ALTER TABLE `ventas`
  MODIFY `estado` enum('PAGADO','ANULADO','RESERVADO')
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PAGADO';

ALTER TABLE `viaje_asientos_estado`
  MODIFY `estado` enum('LIBRE','VENDIDO','RESERVADO')
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'LIBRE';

-- 3) Columnas nuevas en `ventas` para compras en línea
ALTER TABLE `ventas` ADD COLUMN `cliente_id`      varchar(36)  DEFAULT NULL;
ALTER TABLE `ventas` ADD COLUMN `canal`           varchar(15)  NOT NULL DEFAULT 'MOSTRADOR'; -- MOSTRADOR | WEB
ALTER TABLE `ventas` ADD COLUMN `reserva_expira`  datetime     DEFAULT NULL;
ALTER TABLE `ventas` ADD COLUMN `culqi_charge_id` varchar(100) DEFAULT NULL;

CREATE INDEX `idx_ventas_cliente` ON `ventas` (`cliente_id`);
CREATE INDEX `idx_ventas_canal`   ON `ventas` (`canal`);
