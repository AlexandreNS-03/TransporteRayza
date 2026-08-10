# Manual de instalación y despliegue — Transportes Rayza

Cómo levantar el proyecto en local y cómo desplegarlo en producción.

---

## 1. Requisitos

- **Java 17** (JDK)
- **Node.js 20+** y npm
- **MySQL 8/9** (local, para desarrollo)
- Git

## 2. Desarrollo local

### Base de datos
Crear la base y aplicar el esquema:
```bash
mysql -u root -p -e "CREATE DATABASE transportes_rayza CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p transportes_rayza < Backend/sql/schema.sql
```
Luego aplicar las migraciones posteriores (ver Manual de mantenimiento).

### Backend
```bash
cd Backend
./mvnw spring-boot:run        # o: ./mvnw package && java -jar target/app.jar
```
Config por defecto en `src/main/resources/application.properties` (usa `localhost:3306`, usuario `root`). Corre en `http://localhost:8080`.

### Frontend (sistema) y Web (cliente)
```bash
cd Frontend && npm install && npm run dev   # http://localhost:5173
cd Web && npm install && npm run dev         # http://localhost:5174
```
Sin `VITE_API_URL` apuntan a `http://localhost:8080`.

## 3. Producción

### Backend → Railway
1. Servicio del backend con **Root Directory = `Backend`**, Builder **Nixpacks**.
2. Servicio de **MySQL** en el mismo proyecto.
3. Variables de entorno (Settings → Variables):

| Variable | Qué es |
|---|---|
| `SPRING_DATASOURCE_URL` | jdbc de la base (host interno `mysql.railway.internal`) |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | credenciales de MySQL |
| `JWT_SECRET` | clave para firmar los tokens |
| `APP_FRONTEND_URL` | orígenes permitidos por CORS (coma-separados) |
| `NUBEFACT_URL` / `NUBEFACT_TOKEN` | facturación |
| `IZIPAY_ENABLED`, `IZIPAY_USERNAME`, `IZIPAY_PASSWORD`, `IZIPAY_PUBLIC_KEY`, `IZIPAY_HMAC_SHA256` | pasarela tarjeta |
| `MERCADOPAGO_ENABLED`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY` | Yape |
| `RESEND_API_KEY`, `RESEND_FROM` | correo |
| `APISPERU_TOKEN` | consulta DNI/RUC |
| `JPA_DDL_AUTO` | dejar en `none` |

Railway inyecta `PORT` solo. Auto-despliega al mergear a `main`.

> Railway **bloquea SMTP saliente** en planes Free/Hobby → el correo debe ir por Resend (`RESEND_API_KEY`).

### Frontends → Netlify

Los dos sitios se publican **solos desde GitHub Actions** al mergear a `main`
(`.github/workflows/desplegar-web.yml` y `desplegar-sistema.yml`). Cada uno se
dispara solo si el cambio tocó su carpeta.

Se hace así, y no con la conexión a GitHub de Netlify ni arrastrando el `dist`,
por una razón concreta: el `netlify.toml` de cada sitio (redirección SPA y
encabezados de seguridad) queda **fuera** de `dist`, así que subiendo la carpeta a
mano nunca llegaba al sitio. Desplegando desde `Web/` y `Frontend/` sí se aplica.

**Secretos que hay que configurar** una vez, en el repositorio
(Settings → Secrets and variables → Actions):

| Secreto | De dónde sale |
|---|---|
| `NETLIFY_AUTH_TOKEN` | Netlify → User settings → Applications → New access token (uno solo, sirve para ambos sitios) |
| `NETLIFY_SITE_ID` | Site ID (o Project ID) del sitio de **transporterayza.com** |
| `NETLIFY_SITE_ID_SISTEMA` | Site ID del sitio de **sistema.transporterayza.com** |
| `VITE_API_URL` | `https://transporterayza-production.up.railway.app` |

Si faltan, el flujo avisa y no publica, pero no se marca en rojo.

> Si alguno de los sitios está conectado a GitHub desde Netlify, **desconectarlo**:
> si no, cada merge lo desplegaría dos veces.

Para publicar a mano en una emergencia: pestaña **Actions** → el flujo que
corresponda → **Run workflow**.

## 4. Dominios (recomendado)

| Dominio | Apunta a |
|---|---|
| `transporterayza.com` | Web del cliente (Netlify) |
| `sistema.transporterayza.com` | Sistema (Netlify) |
| `api.transporterayza.com` | Backend (Railway) — opcional |

Al usar el subdominio del sistema, agregarlo a `APP_FRONTEND_URL` en Railway o el CORS lo bloquea.

## 5. Primer despliegue de datos

1. Aplicar todas las migraciones en la base de Railway (Manual de mantenimiento).
2. Verificar el esquema: `Backend/sql/verificar-esquema.sql`.
3. Cargar sucursales, embarcaciones, rutas y viajes desde el sistema.
