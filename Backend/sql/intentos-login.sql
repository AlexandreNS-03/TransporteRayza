-- ============================================================================
-- El freno a los intentos de adivinar contraseñas, ahora en la base.
--
--   mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway <<'SQL'
--   ... pegar acá el contenido ...
--   SQL
--
-- Estaba en un mapa en memoria, y ahí tenía dos agujeros que no se ven leyendo
-- el código:
--
--   * CADA DESPLIEGUE REINICIABA LOS CONTADORES. A quien está probando
--     contraseñas le alcanzaba con esperar al próximo deploy.
--   * Con dos instancias, cada una contaría por su lado: la tolerancia real
--     sería el doble de la que dice el código.
--
-- La llave es el texto por el que se cuenta: "usuario:pedro", "ip:190.x.x.x" o
-- "ip-publica:190.x.x.x". No se guarda nada más del intento —ni la contraseña
-- probada, ni el navegador—: para frenar alcanza con contar.
--
-- La tabla se limpia sola cada diez minutos.
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `intentos_login` (
  `llave`           VARCHAR(190) NOT NULL COMMENT 'usuario:<x> | ip:<x> | ip-publica:<x>',
  `fallos`          INT          NOT NULL DEFAULT 0 COMMENT 'Seguidos desde el ultimo exito o bloqueo',
  `bloqueos`        INT          NOT NULL DEFAULT 0 COMMENT 'Cuantas veces ya se bloqueo: cada vez dura mas',
  `ultimo_fallo`    DATETIME         NULL,
  `bloqueado_hasta` DATETIME         NULL,
  PRIMARY KEY (`llave`),
  -- Para que la limpieza programada no recorra la tabla entera.
  KEY `idx_intentos_limpieza` (`bloqueado_hasta`, `ultimo_fallo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
