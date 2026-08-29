-- ============================================================================
-- El mensaje de un anuncio deja de estar limitado a 500 caracteres.
--
--   mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway < Backend/sql/anuncio-mensaje-largo.sql
--
-- Un aviso de fuerza mayor o una disculpa a los pasajeros no entra en 500
-- caracteres. Al pasarse, MySQL rechazaba el guardado y el sistema mostraba
-- "El registro ya existe o acaba de ser tomado por otra venta", que mandaba a
-- buscar el problema al lado equivocado.
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

ALTER TABLE anuncios MODIFY COLUMN mensaje TEXT;

SELECT id, tipo, LEFT(titulo, 40) AS titulo, CHAR_LENGTH(mensaje) AS largo_mensaje
  FROM anuncios
 ORDER BY largo_mensaje DESC;
