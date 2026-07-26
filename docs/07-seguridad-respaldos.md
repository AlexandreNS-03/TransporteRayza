# Seguridad y respaldos — Transportes Rayza

Cómo se protegen los datos, los pagos y el acceso, y cómo se respalda la información.

---

## 1. Autenticación y acceso

- **JWT** firmado con `JWT_SECRET`. El token se envía en `Authorization: Bearer`.
- **Spring Security** protege todos los endpoints `/api/*` salvo `/api/public/*` y `/auth/*`.
- **Roles** (ADMIN/SUPERVISOR/EMPLEADO) limitan qué puede hacer cada usuario; las rutas administrativas exigen ADMIN.
- Contraseñas de personal **hasheadas con BCrypt** (no se guardan en texto).
- Los usuarios se pueden **desactivar** para cortar el acceso sin borrarlos.

> **Acción pendiente recomendada:** cambiar la contraseña del usuario `admin` por defecto y usar contraseñas fuertes.

## 2. Seguridad de los pagos

- **Los datos de tarjeta nunca pasan por el servidor.** Izipay usa un formulario embebido; solo se maneja el `formToken` y la respuesta firmada.
- **Verificación de firma HMAC-SHA256** en cada confirmación de pago con tarjeta: sin firma válida, no se da la venta por pagada. Impide que alguien declare un pago que no ocurrió.
- **Yape:** el celular y el código de aprobación se convierten en un token en el navegador; el backend cobra con ese token. El estado del pago se verifica contra Mercado Pago.
- **Idempotencia:** el id de la reserva evita cobros duplicados en reintentos.
- Los pagos que fallan corren en transacción aislada para no revertir una venta ya cobrada.

## 3. Manejo de secretos

- **Toda credencial vive en variables de entorno** (Railway), nunca en el código ni en el repositorio: JWT, base de datos, Izipay, Mercado Pago, Nubefact, Resend, apisperu.
- Las **claves públicas** de las pasarelas son las únicas que llegan al navegador; los tokens privados y las claves HMAC se quedan en el servidor.
- **Nunca** compartir por chat, correo o capturas: contraseñas, tokens privados, claves HMAC, contraseñas de aplicación.

### Rotación de claves
Rotar de inmediato ante cualquier sospecha de filtración, y periódicamente:
- Izipay: *Generar nueva contraseña / clave HMAC de producción* (Back Office).
- Mercado Pago: regenerar credenciales en el panel.
- Gmail/Resend: revocar la app-password o API key y crear otra.
- `JWT_SECRET`: cambiarlo cierra todas las sesiones activas.

## 4. Transporte y CORS

- Todo el tráfico va por **HTTPS** (Railway y Netlify emiten los certificados).
- **CORS** limita qué dominios pueden llamar a la API (`APP_FRONTEND_URL`). La API pública acepta cualquier origen porque solo expone lectura y compra.
- Los datos personales no viajan en la URL.

## 5. Respaldos (backups)

**Base de datos** — respaldo diario recomendado:
```bash
mysqldump -h <host>.proxy.rlwy.net -P <puerto> -u root -p \
  --set-gtid-purged=OFF --single-transaction railway > backup-$(date +%F).sql
```
- Railway ofrece backups automáticos en su panel; conviene **además** guardar copias propias fuera de Railway (disco/nube).
- **Antes de cualquier operación destructiva** (borrar ventas, migraciones grandes): respaldar primero.

**Restaurar:**
```bash
mysql -h <host> -P <puerto> -u root -p railway < backup-YYYY-MM-DD.sql
```

**Código:** el repositorio en GitHub es el respaldo del código; `main` es la fuente de verdad.

## 6. Auditoría

La tabla `auditoria` registra quién creó, editó o anuló cada venta, comprobante, ruta, etc. (usuario, acción, entidad, fecha). Permite rastrear cualquier cambio.

## 7. Checklist de seguridad para producción

- [ ] Contraseña del admin cambiada (no la de por defecto).
- [ ] `JWT_SECRET` fuerte y único.
- [ ] Credenciales de pasarelas en **producción** (no test) y **rotadas** si se expusieron.
- [ ] `RESEND_API_KEY` y dominio verificado para el correo.
- [ ] `APP_FRONTEND_URL` con los dominios reales.
- [ ] Backup diario configurado y probado (restauración).
- [ ] Ninguna credencial en el repositorio.
