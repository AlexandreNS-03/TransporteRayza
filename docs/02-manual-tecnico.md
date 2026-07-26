# Manual técnico — Transportes Rayza

Arquitectura, tecnologías y estructura del código.

---

## 1. Arquitectura general

```
  Pasajero (web)            Personal (sistema)
        │                          │
        ▼                          ▼
  ┌──────────────┐          ┌──────────────┐
  │  Web/  (SPA) │          │ Frontend/ SPA│      React 19 + Vite
  │  React       │          │  React       │      (Netlify)
  └──────┬───────┘          └──────┬───────┘
         │  HTTPS  /api/public/*          │  HTTPS  /api/* (JWT)
         └──────────────┬────────────────┘
                        ▼
              ┌───────────────────┐
              │   Backend/ API    │   Spring Boot 3.2.5 · Java 17
              │   REST + JWT      │   (Railway)
              └─────────┬─────────┘
                        │ JDBC
                        ▼
                 ┌─────────────┐
                 │   MySQL 9   │   (Railway)
                 └─────────────┘

  Integraciones externas (HTTPS):
   Izipay (tarjeta) · Mercado Pago (Yape) · Nubefact (SUNAT) · Resend (correo) · apisperu (DNI/RUC)
```

Tres proyectos en un repositorio:
- **`Backend/`** — API REST (Spring Boot).
- **`Frontend/`** — sistema administrativo (React SPA).
- **`Web/`** — web pública del cliente (React SPA).

## 2. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Spring Boot 3.2.5, Java 17, Spring Security (JWT), Spring Data JPA / Hibernate |
| Base de datos | MySQL 9 |
| Frontend / Web | React 19, Vite 8, React Router |
| PDFs / QR | jsPDF, qrcode (front); ZXing (back, QR del correo) |
| Excel | librería `xlsx` (carga de rutas/tarifas) |
| Hosting | Railway (backend + MySQL), Netlify (ambos frontends) |
| Pagos | Izipay (formulario embebido Krypton V4), Mercado Pago (Yape, Checkout API) |
| Facturación | Nubefact (comprobantes electrónicos SUNAT) |
| Correo | Resend (API HTTPS) — Gmail SMTP como respaldo local |

## 3. Estructura del backend

```
Backend/src/main/java/com/example/demo/
├── controller/   → endpoints REST (uno por recurso)
├── service/      → lógica de negocio
├── repository/   → acceso a datos (Spring Data JPA)
├── model/        → entidades JPA (tablas)
├── dto/          → objetos de entrada/salida de la API
├── security/     → JWT, filtros, configuración de Spring Security
└── config/       → CORS, scheduling, etc.
Backend/sql/      → migraciones y verificación de esquema
```

**Servicios clave:**
- `ReservaService` — compra en línea (reserva, pago, confirmación).
- `VentaService` — venta de mostrador y embarque.
- `AsientoService` — control de asientos y **venta por tramos**.
- `ComprobanteService` + `NubefactService` — facturación electrónica.
- `IzipayService`, `MercadoPagoService` — pasarelas.
- `EmailService` — correo (Resend/SMTP).
- `PublicService` — API pública (búsqueda, mapa de asientos).

## 4. Conceptos de negocio (los importantes)

**Venta por tramos.** Un asiento se puede vender a varios pasajeros en tramos que no se cruzan. La disponibilidad la decide el solapamiento de tramos (`viaje_asiento_tramos_ocupados`), no el estado del asiento. Una llave única `uk_asiento_tramo` impide la doble venta a nivel de base de datos.

**IGV exonerado.** Operación exonerada de la Amazonía: `tipo_de_igv = 8`, `total_exonerada`, IGV 0.

**Correlativo de comprobantes.** Se envía `numero: "#"` a Nubefact para que **él asigne** el correlativo; se guarda el número que devuelve. Evita desincronización.

**Estados de viaje.** Un job (`@Scheduled`) los avanza: PROGRAMADO → EN_CURSO → COMPLETADO.

**Reservas web.** Un job libera las reservas no pagadas a los 15 minutos.

## 5. Seguridad de las transacciones

- Los pagos que fallan corren en su propia transacción (`REQUIRES_NEW`) para no revertir una venta ya cobrada.
- La confirmación de pago de tarjeta se verifica por **firma HMAC-SHA256** (Izipay); Yape verifica el estado del pago devuelto por Mercado Pago.

## 6. Migraciones de base de datos

`spring.jpa.hibernate.ddl-auto=none` — Hibernate **no** modifica el esquema. Los cambios se aplican a mano con los scripts de `Backend/sql/` (ver Manual de mantenimiento). `verificar-esquema.sql` comprueba que la base tenga todo lo que el código espera.

## 7. Convenciones

- Ramas por cambio; PR a `main`; Railway y Netlify redespliegan al mergear.
- El backend lee toda la configuración sensible de variables de entorno (nunca hardcodeada).
