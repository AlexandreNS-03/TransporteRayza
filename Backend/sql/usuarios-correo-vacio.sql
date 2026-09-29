-- ============================================================================
-- Usuarios con el correo guardado como cadena vacía en vez de NULL.
--
--   Opción A (desde tu máquina, parado en el repo):
--       mysql -h <host-publico> -P <puerto> -u root -p railway < Backend/sql/usuarios-correo-vacio.sql
--
--   Opción B (consola del contenedor de MySQL en Railway):
--       mysql -u root -p"$MYSQL_ROOT_PASSWORD" railway <<'SQL'
--       ... pegar acá el contenido ...
--       SQL
--
-- Por qué: la columna tiene índice único (uq_usuario_email) y MySQL admite
-- varios NULL pero no varias cadenas vacías. El formulario mandaba "" cuando
-- el campo quedaba sin llenar, así que la primera cuenta sin correo ocupaba
-- el "" y la segunda fallaba con:
--
--     Duplicate entry '' for key 'usuarios.uq_usuario_email'
--
-- El código ya no vuelve a guardar "" (Usuario.setEmail), pero la fila que
-- quedó así sigue ahí. Esto la normaliza.
--
-- Se puede ejecutar las veces que haga falta.
-- ============================================================================

-- Cuántas hay antes (debería ser 0 o 1: el índice no deja más)
SELECT COUNT(*) AS con_correo_vacio_antes
FROM usuarios
WHERE email IS NOT NULL AND TRIM(email) = '';

UPDATE usuarios
SET email = NULL
WHERE email IS NOT NULL AND TRIM(email) = '';

-- Y de paso, los que tienen espacios de sobra a los costados: con el índice
-- único, " ventas@x.com" y "ventas@x.com" son dos correos distintos.
UPDATE usuarios
SET email = TRIM(email)
WHERE email IS NOT NULL AND email <> TRIM(email);

SELECT COUNT(*) AS con_correo_vacio_despues
FROM usuarios
WHERE email IS NOT NULL AND TRIM(email) = '';

SELECT 'listo: los correos vacíos quedaron en NULL' AS resultado;
