# Guía de Despliegue — Transportes Rayza

Arquitectura recomendada:
- **Backend (Spring Boot) + MySQL** → Railway
- **Frontend (React/Vite)** → Vercel (gratis)

El código ya está preparado: la URL del API, el CORS, el puerto y la base de datos
se configuran por **variables de entorno**, sin tocar el código.

---

## 1. Base de datos (Railway MySQL)

1. En [railway.app](https://railway.app) crea un proyecto → **New → Database → MySQL**.
2. Cuando esté lista, entra a la pestaña **Data** o **Connect** y copia sus datos
   (host, puerto, database, user, password).
3. Importa el esquema. Desde tu PC (con el cliente `mysql`):
   ```bash
   mysql -h <MYSQLHOST> -P <MYSQLPORT> -u <MYSQLUSER> -p<MYSQLPASSWORD> <MYSQLDATABASE> < Backend/sql/schema.sql
   ```
   Esto crea las 23 tablas. Si quieres llevar también tus datos actuales
   (sucursales, rutas, embarcaciones, usuarios), exporta desde tu MySQL local:
   ```bash
   mysqldump -u root -p transportes_rayza > datos.sql   # (incluye estructura + datos)
   mysql -h <MYSQLHOST> -P <MYSQLPORT> -u <MYSQLUSER> -p<MYSQLPASSWORD> <MYSQLDATABASE> < datos.sql
   ```

---

## 2. Backend (Railway)

1. En el mismo proyecto: **New → GitHub Repo** y elige `AlexandreNS-03/TransporteRayza`.
2. En **Settings** del servicio:
   - **Root Directory**: `Backend`
   - (El build usa `Backend/nixpacks.toml`: Java 17 + `mvn package` + `java -jar target/app.jar`.)
3. En **Variables** agrega:
   | Variable | Valor |
   |---|---|
   | `SPRING_DATASOURCE_URL` | `jdbc:mysql://<MYSQLHOST>:<MYSQLPORT>/<MYSQLDATABASE>` |
   | `SPRING_DATASOURCE_USERNAME` | el user de MySQL |
   | `SPRING_DATASOURCE_PASSWORD` | el password de MySQL |
   | `JWT_SECRET` | una clave larga (mín. 32 caracteres) |
   | `MAIL_PASSWORD` | app-password de Gmail **(genera uno nuevo)** |
   | `NUBEFACT_URL` | tu ruta de Nubefact |
   | `NUBEFACT_TOKEN` | tu token de Nubefact |
   | `APISPERU_TOKEN` | tu token de apisperu (consulta DNI/RUC) |
   | `APP_FRONTEND_URL` | la URL de Vercel (se llena en el paso 3) |
   > Railway inyecta `PORT` automáticamente — no lo pongas tú.
4. Deploy. Cuando termine, Railway te da una URL pública, ej.
   `https://transporterayza-production.up.railway.app`. Esa es la **URL del backend**.

---

## 3. Frontend (Vercel)

1. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el mismo repo.
2. Configura:
   - **Root Directory**: `Frontend`
   - **Framework Preset**: Vite (se detecta solo)
3. En **Environment Variables** agrega:
   | Variable | Valor |
   |---|---|
   | `VITE_API_URL` | la URL del backend de Railway (paso 2.4, **sin** barra final) |
4. Deploy. Vercel te da una URL, ej. `https://transporte-rayza.vercel.app`.
5. **Vuelve a Railway** → variable `APP_FRONTEND_URL` = esa URL de Vercel → redeploy del backend
   (para que el CORS acepte al frontend).

---

## 4. Ajustes finales

- **Nubefact a producción**: en Railway cambia las series a las de tu panel real.
  En `Backend/src/main/resources/application.properties` los valores por defecto son demo
  (`FFF1`, `BBB1`); sobreescríbelos con variables o edítalos:
  `nubefact.serie.factura`, `nubefact.serie.boleta`, `nubefact.serie.nc-factura`, `nubefact.serie.nc-boleta`.
- **Logo**: el archivo `Frontend/public/logo-rayza.png` ya es tu logo; se despliega con el frontend.
- **HTTPS**: Railway y Vercel lo dan automáticamente. No hay que configurar nada.

---

## Desarrollo local (sin cambios)

Todo sigue funcionando en local igual que antes:
- Backend: `cd Backend && ./mvnw spring-boot:run` (usa `secrets.properties` y MySQL local).
- Frontend: `cd Frontend && npm run dev` (usa `http://localhost:8080` por defecto).
