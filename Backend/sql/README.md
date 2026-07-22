# Migraciones de base de datos

El proyecto usa `spring.jpa.hibernate.ddl-auto=none`: **Hibernate no crea ni modifica
tablas**. Cada cambio de esquema se aplica a mano con los archivos de esta carpeta.

Si se despliega el backend sin aplicar su migración, la aplicación arranca igual pero
los endpoints que tocan las columnas nuevas devuelven **HTTP 400** con un error de
Hibernate del tipo `Unknown column 'v1_0.canal' in 'field list'`. Es la señal de que
falta correr una migración.

## Orden de aplicación

| # | Archivo | Qué agrega |
|---|---|---|
| 0 | `schema.sql` | Esquema completo (solo para una base nueva desde cero) |
| 1 | `comprobantes.sql` | Comprobantes electrónicos y su correlativo |
| 2 | `mejoras_igv_sucursales.sql` | Exoneración de IGV (Amazonía) y alcance por sucursal |
| 3 | `mapa-asientos-tripulacion.sql` | Posición del VIP, capitán, tripulantes y renumeración de asientos |
| 4 | `migracion-fase2-clientes-reservas.sql` | Cuentas de cliente, reservas y pago en línea (Culqi) |

En una base nueva basta con `schema.sql`; ya incluye todo lo anterior.

## Cómo aplicarlas

```bash
mysql -h <host> -P <puerto> -u <usuario> -p <base> < Backend/sql/<archivo>.sql
```

En Railway, el host y el puerto son los del **proxy público** (`*.proxy.rlwy.net`), no
el host interno `mysql.railway.internal`, que solo es visible desde dentro de Railway.

Los archivos 3 y 4 son **idempotentes**: comprueban antes de cada `ALTER` si el cambio
ya está aplicado, así que se pueden volver a correr sin miedo. Ante la duda, córrelos.

## Comprobar que la base está al día

Esta consulta debe devolver 6 filas. Si falta alguna, corre la migración correspondiente:

```sql
SELECT 'ventas.canal'             AS falta FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='ventas'        AND column_name='canal'
UNION ALL SELECT 'ventas.cliente_id'       FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='ventas'        AND column_name='cliente_id'
UNION ALL SELECT 'ventas.reserva_expira'   FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='ventas'        AND column_name='reserva_expira'
UNION ALL SELECT 'ventas.culqi_charge_id'  FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='ventas'        AND column_name='culqi_charge_id'
UNION ALL SELECT 'embarcaciones.vip_posicion' FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='embarcaciones' AND column_name='vip_posicion'
UNION ALL SELECT 'tabla clientes'         FROM information_schema.tables  WHERE table_schema=DATABASE() AND table_name='clientes';
```

## Al desplegar

1. Desplegar el backend.
2. Aplicar las migraciones nuevas que traiga ese cambio.
3. Verificar con la consulta de arriba.

Hacerlo en ese orden deja como mucho unos minutos de endpoints en 400; al revés
(migrar antes de desplegar) también funciona, porque todas las migraciones solo
**agregan** columnas y el código viejo las ignora.
