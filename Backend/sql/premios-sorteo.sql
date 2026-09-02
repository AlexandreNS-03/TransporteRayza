-- ============================================================================
-- Varios premios por sorteo.
--
--   mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway < Backend/sql/premios-sorteo.sql
--
-- Un mismo sorteo puede repartir varios premios entre los mismos participantes:
-- la rueda gira una vez por premio y cada giro elige entre quienes todavía no
-- ganaron. El valor va por premio porque las bases exigen el de cada uno.
--
-- Los sorteos que ya existen se convierten a un premio único con lo que tenían,
-- así que el historial sigue mostrando lo mismo que antes.
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

CREATE TABLE IF NOT EXISTS premios_sorteo (
  id               VARCHAR(36) NOT NULL PRIMARY KEY,
  sorteo_id        VARCHAR(36) NOT NULL,
  orden            INT         NOT NULL,          -- 1 = premio mayor
  descripcion      VARCHAR(300),
  valor            DECIMAL(10,2),
  cupon_ganador_id VARCHAR(36),
  sorteado_at      DATETIME,
  sorteado_por     VARCHAR(100),
  UNIQUE KEY uq_premio_orden (sorteo_id, orden),
  KEY idx_premio_sorteo (sorteo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Los sorteos anteriores pasan a tener su premio de siempre como premio 1.
-- El WHERE evita duplicarlo si este script se corre dos veces.
INSERT INTO premios_sorteo (id, sorteo_id, orden, descripcion, valor,
                            cupon_ganador_id, sorteado_at, sorteado_por)
SELECT UUID(), s.id, 1, s.premio, s.premio_valor,
       s.cupon_ganador_id, s.sorteado_at, s.sorteado_por
FROM sorteos s
WHERE NOT EXISTS (SELECT 1 FROM premios_sorteo p WHERE p.sorteo_id = s.id);

SELECT (SELECT COUNT(*) FROM sorteos)        AS sorteos,
       (SELECT COUNT(*) FROM premios_sorteo) AS premios;
