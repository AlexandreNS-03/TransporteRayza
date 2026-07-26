# Documentación de la base de datos — Transportes Rayza

Motor: **MySQL 9**, charset `utf8mb4`. 22 tablas. El esquema completo está en `Backend/sql/schema.sql`.

---

## 1. Diagrama de relaciones (resumen)

```
sucursales ──< usuarios
sucursales ──< rutas ──< ruta_paradas
                  └────< ruta_tarifas_tramo
embarcaciones ──< embarcacion_asientos
              └──< embarcacion_tripulantes
rutas + embarcaciones ──> viajes ──< viaje_paradas
                                 ├──< viaje_tarifas_tramo
                                 └──< viaje_asientos_estado ──< viaje_asiento_tramos_ocupados
viajes ──< ventas ──< venta_tramos_usados
ventas ──< comprobantes
clientes ──< ventas   (compras en línea)
cajas ──< movimientos_caja ; cajas ──< gastos
encomiendas ; notificaciones ; auditoria ; solicitudes_intersucursal ; config_comprobantes
```

## 2. Tablas por área

### Personal y organización
| Tabla | Descripción |
|---|---|
| `usuarios` | Personal del sistema. Rol (ADMIN/SUPERVISOR/EMPLEADO), sucursal, activo. |
| `sucursales` | Sedes (Requena, Iquitos). Administran sus rutas y viajes. |
| `clientes` | Cuentas de pasajeros de la web (opcional; también se compra como invitado). |

### Rutas y embarcaciones
| Tabla | Descripción |
|---|---|
| `rutas` | Trayecto (origen → destino), precios base, sucursal. |
| `ruta_paradas` | Paradas de la ruta, en orden, con `minutos_desde_salida`. |
| `ruta_tarifas_tramo` | Precio (normal/VIP) por par de paradas. |
| `embarcaciones` | Botes: cantidad VIP/normal, `vip_posicion` (PROA/POPA), capitán. |
| `embarcacion_asientos` | Asientos del bote (número, tipo). |
| `embarcacion_tripulantes` | Tripulación (nombre, cargo). |

### Viajes y asientos
| Tabla | Descripción |
|---|---|
| `viajes` | Salida concreta: ruta + embarcación + fecha/hora. Estado (PROGRAMADO/EN_CURSO/COMPLETADO/CANCELADO). |
| `viaje_paradas` | Copia de las paradas de la ruta al crear el viaje. |
| `viaje_tarifas_tramo` | Tarifas del viaje (si aplican). |
| `viaje_asientos_estado` | Estado de cada asiento del viaje (LIBRE/RESERVADO/VENDIDO), pasajero. |
| `viaje_asiento_tramos_ocupados` | Tramos ocupados por asiento — **corazón de la venta por tramos**. Llave única `uk_asiento_tramo(viaje_asiento_estado_id, tramo)` impide la doble venta. |

### Ventas y comprobantes
| Tabla | Descripción |
|---|---|
| `ventas` | Pasaje vendido. Pasajero, tramo, asiento, precio, estado (PAGADO/RESERVADO/ANULADO), `canal` (MOSTRADOR/WEB), `pasarela_referencia`. |
| `venta_tramos_usados` | Tramos que ocupa cada venta. |
| `comprobantes` | Boleta/factura/nota de crédito electrónica. Serie, número (asignado por Nubefact), estado, enlace PDF. |
| `config_comprobantes` | Configuración de series/tipos. |

### Caja, encomiendas y sistema
| Tabla | Descripción |
|---|---|
| `cajas` | Apertura/cierre de caja por usuario. |
| `movimientos_caja` | Ingresos/egresos (las ventas registran ingreso automático). |
| `gastos` | Gastos anotados a mano. |
| `encomiendas` | Envíos de carga (remitente, destinatario, precio, estado). |
| `notificaciones` | Avisos internos. |
| `solicitudes_intersucursal` | Coordinación entre sucursales. |
| `auditoria` | Registro de acciones (usuario, acción, entidad, descripción, fecha). |

## 3. Notas importantes

- **Correlativo de comprobantes:** lo asigna Nubefact; el sistema guarda el número devuelto. Hay unicidad `uk_comprobante_tipo_serie_numero`.
- **IGV exonerado:** los comprobantes guardan `total_exonerada`, IGV 0 (Amazonía).
- **Tipos ENUM vs varchar:** algunas columnas de estado son `varchar` (no ENUM de MySQL); el código lo maneja. Por eso `ddl-auto` está en `none` y no en `validate`.
- **Integridad al borrar ventas:** eliminar una venta requiere borrar antes `venta_tramos_usados` y `comprobantes` que la referencian; `viaje_asientos_estado.venta_id` se pone a NULL.

## 4. Verificación del esquema

`Backend/sql/verificar-esquema.sql` compara las 22 tablas y sus columnas contra lo que el código espera. Devuelve filas solo cuando falta algo. Se regenera desde las entidades cuando se agregan campos.
