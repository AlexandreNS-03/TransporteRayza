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

```bash
mysql -h <host> -P <puerto> -u <usuario> -p <base> < Backend/sql/verificar-esquema.sql
```

`verificar-esquema.sql` compara las 22 tablas y 261 columnas que el backend necesita
contra lo que hay en la base. **No modifica nada.** Si no devuelve ninguna fila, la
base está al día; cada fila que salga es una tabla o columna que falta:

```
COLUMNA FALTANTE   ventas   canal
```

El script se generó a partir de las entidades JPA, así que cuando se agreguen campos
nuevos hay que regenerarlo junto con la migración.

### ¿Por qué no `ddl-auto=validate`?

Sería la forma natural de que la app avisara al arrancar, pero hoy no se puede activar:
el esquema usa `smallint` y `text` donde las entidades declaran `Integer` y `String`
(25 diferencias que no afectan al funcionamiento, pero que `validate` rechaza). Cuando
esos tipos se normalicen se puede activar con `JPA_DDL_AUTO=validate`, que ya está
contemplado en `application.properties`.

## Al desplegar

1. Desplegar el backend.
2. Aplicar las migraciones nuevas que traiga ese cambio.
3. Verificar con la consulta de arriba.

Hacerlo en ese orden deja como mucho unos minutos de endpoints en 400; al revés
(migrar antes de desplegar) también funciona, porque todas las migraciones solo
**agregan** columnas y el código viejo las ignora.
