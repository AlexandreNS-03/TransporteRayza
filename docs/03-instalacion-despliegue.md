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

**Sistema (`Frontend/`)** — auto-deploy conectado a GitHub:
- Base directory: `Frontend`, build `npm run build`, publish `dist`.
- Variable: `VITE_API_URL = https://transporterayza-production.up.railway.app`
- SPA redirect a `/index.html` (ya en `netlify.toml`).

**Web del cliente (`Web/`)** — despliegue **manual** (drag & drop):
```bash
git switch main && git pull
cd Web && rm -rf dist && VITE_API_URL=https://transporterayza-production.up.railway.app npm run build
```
Arrastrar `Web/dist` a Netlify (Add new site → Deploy manually). Rehacer tras cada cambio en `Web/`.

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
