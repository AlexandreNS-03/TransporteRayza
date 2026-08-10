# Manual de mantenimiento — Transportes Rayza

Tareas periódicas y operaciones habituales sobre el sistema en producción.

---

## 1. Migraciones de base de datos

Hibernate **no** modifica el esquema (`ddl-auto=none`). Cada cambio se aplica a mano con los scripts de `Backend/sql/`, en este orden (en una base nueva basta `schema.sql`, que ya los incluye):

| # | Archivo | Agrega |
|---|---|---|
| 0 | `schema.sql` | Esquema completo (base nueva) |
| 1 | `comprobantes.sql` | Comprobantes y correlativo |
| 2 | `mejoras_igv_sucursales.sql` | IGV exonerado y alcance por sucursal |
| 3 | `mapa-asientos-tripulacion.sql` | VIP, capitán, tripulantes |
| 4 | `migracion-fase2-clientes-reservas.sql` | Cuentas de cliente, reservas |
| 5 | `viaje-paradas-canal.sql` | Paradas de viajes, canal de venta |
| 6 | `paradas-rutas-completas.sql` | Paradas completas con terminales |
| 7 | `paradas-minutos.sql` | Minutos por parada |
| 8 | `pasarela-izipay.sql` | Renombra la columna de referencia de pasarela |

**Aplicar una migración** (usar el proxy público de Railway, no el host interno):
```bash
mysql -h <host>.proxy.rlwy.net -P <puerto> -u root -p railway < Backend/sql/<archivo>.sql
```

Las migraciones 3+ son **re-ejecutables** (comprueban antes de cada cambio). Los `ALTER … ADD COLUMN` de las viejas fallan si se repiten — correr una sola vez.

**Verificar que la base esté al día** (no modifica nada; devuelve filas solo si falta algo):
```bash
mysql -h <host> -P <puerto> -u root -p railway < Backend/sql/verificar-esquema.sql
```

## 2. Al desplegar un cambio

1. Mergear el PR a `main`. **Todo se despliega solo**: Railway (backend) y, por GitHub Actions, los dos sitios de Netlify — pero cada uno solo si el cambio tocó su carpeta.
2. Si el cambio trae migración nueva, aplicarla a la base **antes** de que el backend arranque con el código nuevo.
3. Verificar el esquema.

> Ya no hay que arrastrar ninguna carpeta `dist` a Netlify. Si algo no se publicó, mirar la pestaña **Actions** del repositorio: ahí está el motivo.

## 3. Respaldos (backups)

**Antes de cualquier operación destructiva**, respaldar:
```bash
mysqldump -h <host> -P <puerto> -u root -p --set-gtid-purged=OFF --single-transaction railway > backup-$(date +%F).sql
```
Recomendado: respaldo **diario** (Railway ofrece backups automáticos en su panel; conviene además guardar copias propias periódicas).

**Restaurar:**
```bash
mysql -h <host> -P <puerto> -u root -p railway < backup-YYYY-MM-DD.sql
```

## 4. Tareas periódicas

| Tarea | Frecuencia |
|---|---|
| Backup de la base | Diario |
| Programar viajes | Según la operación (semanal) |
| Cargar/actualizar tarifas por tramo | Cuando cambien los precios |
| Revisar auditoría | Semanal |
| Verificar que las pasarelas estén activas | Tras cada redespliegue |
| Rotar claves (JWT, pasarelas, correo) | Ante cualquier sospecha o filtración |

## 5. Jobs automáticos (ya integrados)

- **Estados de viaje** — PROGRAMADO → EN_CURSO → COMPLETADO (cada 5 min).
- **Reservas vencidas** — libera asientos de reservas no pagadas (cada minuto, 15 min de plazo).

No requieren intervención.

## 6. Limpieza de datos de prueba

Antes de operar en real, si quedaron ventas/comprobantes de prueba: respaldar, luego borrar en orden por las claves foráneas — `comprobantes`, `venta_tramos_usados`, `ventas` (los asientos se sueltan solos). **Ojo:** borrar comprobantes reinicia el conteo local, pero Nubefact conserva su correlativo — por eso el sistema usa `numero: "#"` para que Nubefact asigne el número y nunca choque.

## 7. Monitoreo

- **Railway** → logs del servicio backend (errores, arranque, avisos de correo/pasarela).
- **Netlify** → estado de los deploys.
- El backend avisa al arrancar por qué medio envía correo y si falta configuración.
