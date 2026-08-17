-- ============================================================================
-- Anuncios administrables desde el sistema: barra superior, modal y tarjetas
-- del landing de la web pública. Antes, ese contenido estaba escrito a mano
-- en el código de Web/ (AnnouncementBar.jsx, AnuncioAniversario.jsx).
--
--   mysql -h <host>.proxy.rlwy.net -P <puerto> -u root -p railway < Backend/sql/anuncios.sql
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `anuncios` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `titulo` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensaje` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('BARRA','MODAL','LANDING') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `texto_enlace` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url_enlace` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
