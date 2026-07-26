# Documentación de la API — Transportes Rayza

API REST del backend (Spring Boot). Base: `https://transporterayza-production.up.railway.app`

---

## Autenticación

- **Personal:** `POST /auth/login` con `{username, password}` → devuelve un **JWT**. Enviarlo en cada llamada protegida: `Authorization: Bearer <token>`.
- **Clientes web:** `POST /auth/cliente/login` y `/auth/cliente/register` (opcional; se compra como invitado).
- Los endpoints bajo `/api/public/*` son **públicos** (sin token). El resto de `/api/*` requiere token y rol adecuado.
- CORS: orígenes permitidos por `APP_FRONTEND_URL`; la API pública acepta cualquier origen.

---

## API pública (web del cliente, sin login)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/public/rutas` | Rutas activas con paradas y tramos |
| GET | `/api/public/ubicaciones` | Paradas disponibles (orden de recorrido) |
| GET | `/api/public/viajes?origen=&destino=&fecha=` | Buscar viajes vendibles |
| GET | `/api/public/viajes/{id}/asientos?ordenOrigen=&ordenDestino=` | Mapa de asientos del tramo |
| GET | `/api/public/boletos?correo=` \| `?documento=` | Historial de boletos (sin cuenta) |
| POST | `/api/public/reservas` | Crear reserva (retiene el asiento) |
| GET | `/api/public/reservas/metodos-de-pago` | Medios activos + claves públicas |
| POST | `/api/public/reservas/{id}/pago/formulario` | Formulario de Izipay (tarjeta) |
| POST | `/api/public/reservas/{id}/pagar/yape` | Pagar con Yape `{token}` |
| POST | `/api/public/reservas/{id}/pagar` | Confirmar pago tarjeta `{krAnswer, krHash}` |

## Ventas y embarque (personal)

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST | `/api/ventas` | Listar / crear venta de mostrador |
| GET | `/api/ventas/{id}` · `/qr/{qr}` · `/documento/{doc}` · `/viaje/{id}` | Consultas |
| POST | `/api/ventas/{id}/enviar-comprobante` | Reenviar boleto por correo |
| PUT/PATCH | `/api/ventas/{id}` · `/{id}/anular` · `/{id}/embarcar` | Editar, anular, embarcar |
| GET | `/api/ventas/mis-embarques-hoy` | Embarques del día del usuario |

## Viajes, rutas, embarcaciones

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST | `/api/viajes` · `/api/viajes/filtrar` | Listar / crear / filtrar |
| GET/POST/PUT/DELETE | `/api/rutas` · `/{id}` | CRUD de rutas |
| GET | `/api/rutas/{id}/tarifa?ordenOrigen=&ordenDestino=` | Tarifa de un tramo |
| GET/POST/PUT/DELETE | `/api/embarcaciones` · `/{id}` · `/activas` · `/{id}/asientos` | CRUD embarcaciones |
| GET | `/api/viajes/{id}/asientos` · `/asientos/libres` | Asientos del viaje |

## Comprobantes

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST | `/api/comprobantes` · `/venta/{id}` · `/{id}/nubefact` | Listar / emitir / ver JSON |
| PATCH/POST | `/api/comprobantes/{id}/anular` · `/{id}/nota-credito` | Anular, nota de crédito |

## Caja, gastos, encomiendas

| Método | Ruta |
|---|---|
| GET/POST/PATCH | `/api/cajas` · `/mi-caja` · `/abrir` · `/{id}/cerrar` · `/{id}/movimientos` · `/movimientos` |
| GET/POST/DELETE | `/api/gastos` · `/{id}` |
| GET/POST/PATCH | `/api/encomiendas` · `/{id}/estado` |

## Administración

| Método | Ruta |
|---|---|
| GET/POST/PATCH | `/api/usuarios` · `/{id}/rol` · `/{id}/activo` · `/{id}/sucursal` · `/{id}/password` |
| GET/POST/PUT/DELETE | `/api/sucursales` · `/{id}` · `/activas` |
| GET | `/api/dashboard` · `/api/auditoria` |
| GET | `/api/consulta/dni/{dni}` · `/api/consulta/ruc/{ruc}` |
| GET/POST/PATCH | `/api/soporte` · `/{id}/atendido` |
| GET/POST/PATCH | `/api/cliente/perfil` · `/api/cliente/viajes` |

---

## Formato de errores

Los errores de negocio devuelven **HTTP 400** con `{"message": "..."}`. Sin token o sin permiso, **403**. Un recurso inexistente, **404**.

## Notas de integración

- **Izipay:** el backend pide un `formToken` a Nubefact… (Izipay `CreatePayment`), el navegador dibuja el formulario y devuelve `kr-answer` + `kr-hash`; el backend verifica la firma **HMAC-SHA256**.
- **Yape (Mercado Pago):** el navegador genera un token con el SDK; el backend cobra con `POST /v1/payments` (`payment_method_id: yape`) y usa el id de la reserva como clave de idempotencia.
- **Nubefact:** se envía `numero: "#"` para que asigne el correlativo; se guarda el que devuelve.
