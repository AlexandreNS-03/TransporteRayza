# Manual de administrador — Transportes Rayza

Guía para quien administra el sistema (rol **Administrador**). Cubre las tareas de gestión que no hace el personal de mostrador.

---

## 1. Roles y usuarios

El sistema tiene tres roles:

| Rol | Alcance |
|---|---|
| **ADMIN** | Todo: usuarios, rutas, embarcaciones, sucursales, reportes, configuración. |
| **SUPERVISOR** | Vender y gestionar viajes de su sucursal; ver reportes. |
| **EMPLEADO** | Vender pasajes y encomiendas; controlar embarque. |

**Crear / administrar usuarios** — sección *Roles / Usuarios*:
- Crear usuario (nombre, usuario, contraseña, rol, sucursal).
- Cambiar rol, activar/desactivar, reasignar sucursal, resetear contraseña.
- Un usuario **desactivado** no puede iniciar sesión.

> **Seguridad:** cambia la contraseña del usuario `admin` apenas empieces. No dejes la clave por defecto.

## 2. Sucursales

Cada sucursal (Requena, Iquitos) administra sus propias rutas y viajes. Un empleado con sucursal asignada **solo vende los viajes de su sucursal**; el ADMIN vende cualquiera. Se administran en *Sucursales* (crear, editar, activar/desactivar).

## 3. Rutas

Una ruta es un trayecto con sus **paradas** y **tarifas por tramo**. Se crea en dos pasos (ver el Manual de usuario, sección Rutas):

1. **Datos y paradas** — origen, destino, sucursal, precios base; luego las paradas (la primera es el origen, la última el destino) con sus minutos estimados de llegada. Se cargan desde Excel (`.xlsx`) o a mano.
2. **Precios por tramo** — se descarga la plantilla con todas las combinaciones, se llenan los precios y se sube.

**Reglas:**
- La primera parada debe ser el origen y la última el destino, o no se podrán vender los tramos hacia los puertos principales.
- Los tramos sin precio propio usan la tarifa base de la ruta.
- Editar una ruta permite volver a subir paradas o precios.

## 4. Embarcaciones

Registrar cada bote con: cantidad de asientos VIP y normales, **posición del VIP** (proa/popa), **capitán** y **tripulación**. Los asientos se generan y numeran solos (desde la proa). Si cambian las cantidades o la posición del VIP, se renumeran.

## 5. Viajes

Un viaje = ruta + embarcación + fecha y hora. Al crearlo hereda las paradas de la ruta y los asientos de la embarcación. El estado avanza automáticamente:

`PROGRAMADO → EN_CURSO (al cerrar el embarque, salida+20min) → COMPLETADO (pasadas ~12h)`

Solo los viajes futuros y programados aparecen en la web del cliente.

## 6. Comprobantes electrónicos

- Se emiten boletas/facturas desde una venta (Nubefact → SUNAT).
- En la selva no se cobra IGV (operación exonerada — Ley de la Amazonía).
- **El correlativo lo asigna Nubefact**, no el sistema.
- Anulación mediante **nota de crédito**.
- Series configuradas: `FFF1` (factura), `BBB1` (boleta). Verificar en el panel de Nubefact al pasar a facturación real.

## 7. Caja, gastos y reportes

- **Caja:** cada vendedor abre y cierra su caja; las ventas registran el ingreso solas.
- **Gastos:** se anotan a mano y descuentan de la caja.
- **Reportes:** ventas por período, exportables.
- **Auditoría:** registra quién creó, editó o anuló cada cosa (usuario, acción, fecha).

## 8. Soporte

La sección *Soporte* recibe incidencias reportadas desde la web; se marcan como atendidas.

## 9. Configuración clave (en Railway)

Estas variables las administra el ADMIN técnico (ver Manual de instalación):
- Pasarelas: `IZIPAY_*`, `MERCADOPAGO_*`
- Facturación: `NUBEFACT_*`
- Correo: `RESEND_API_KEY`, `RESEND_FROM`
- CORS: `APP_FRONTEND_URL`

## Tareas de arranque (checklist)

- [ ] Cambiar contraseña del admin.
- [ ] Crear usuarios del personal con su sucursal.
- [ ] Registrar embarcaciones (asientos, VIP, capitán).
- [ ] Cargar rutas con paradas, minutos y tarifas por tramo.
- [ ] Programar los viajes de la semana.
- [ ] Verificar que las pasarelas y Nubefact estén en modo producción.
