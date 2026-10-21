# Reunión GMoney — sandbox de Yape On File

**21/10/2026, 14:00.** Contacto: John Luna, Key Account Manager, (+51) 940 169 193.
Merchant: MULTISERVICIOS RAYZA E.I.R.L., RUC 20600697928. Contrato firmado, 2 años,
3.20 % + IGV (3.776 % efectivo).

Lo nuestro ya está escrito y probado en simulación (PR #151): `AutorizacionYape`
(PENDIENTE → ACTIVA → REVOCADA), `YapeOnFileService`, `/api/yape-on-file`, la migración
`Backend/sql/autorizaciones-yape.sql` y 7 pruebas. **Quedan exactamente dos métodos
marcados `PENDIENTE PROVEEDOR`**: pedir el deeplink de autorización y ejecutar el cobro.
Todo lo de abajo es para poder escribir esos dos.

---

## Lo que hay que salir con esto sí o sí

**1. Accesos al sandbox, hoy.** Credenciales, URL base del ambiente de pruebas y URL base
de producción. Sin sandbox no se puede integrar sin cobrar de verdad, y no vamos a probar
contra producción con plata real.

**2. La documentación de la API.** Endpoints, cómo se autentica (¿token fijo? ¿OAuth? ¿se
renueva?), qué campos lleva cada pedido y qué devuelve, y la lista de códigos de error.

**3. El deeplink de autorización.** La propuesta dice que "Yape brinda un deeplink para que
el usuario ingrese a Yape a aprobar el credential-on-file", pero no dice **cómo se pide**.
Preguntar: a qué endpoint, qué le mandamos, qué devuelve, **cuánto dura el enlace**, y cómo
nos enteramos de que el cliente aprobó — ¿nos avisan o tenemos que preguntar?

**4. Idempotencia en el cobro.** *Esta es la que cuesta plata si falta.* ¿Aceptan una clave
de idempotencia nuestra en el cobro, y la respetan? Si mandamos el mismo cobro dos veces
—porque se cortó la red y reintentamos—, ¿cobran una vez o dos? **Si no la soportan, lo
tenemos que controlar de nuestro lado antes de encender esto**, y conviene saberlo hoy y no
después.

**5. El webhook y su firma.** ¿A qué nos avisan, con qué eventos, y **cómo verificamos que
el aviso es de ustedes**? Pedir el algoritmo exacto, qué cabecera trae la firma y sobre qué
cuerpo se calcula. Sin eso, cualquiera que adivine la URL nos declara un pago.
*(Con Mercado Pago ya pasamos por esto — ver `webhook-mercadopago`.)*

**6. Reintentos del webhook.** Si nuestro servidor no contesta, ¿reintentan? ¿cuántas veces
y cada cuánto? ¿Qué código HTTP esperan para darlo por entregado?

---

## Plata y condiciones

**7. ¿El 3.20 % aplica a toda transacción o solo a las de On File?** La propuesta no lo
aclara. Es una diferencia grande: hoy la venta web con Yape va por Mercado Pago.

**8. ¿Convive con Mercado Pago o lo reemplaza?** Si conviven, hay que decidir qué cobra
cada uno. Si reemplaza, hay que migrar la venta web entera y eso es otro proyecto.

**9. ¿Cuándo liquidan?** Cada cuántos días cae la plata, a qué cuenta, y si hay un informe
descargable para conciliar. Hoy la plata de la web no entra a caja y se concilia aparte.

**10. Devoluciones.** ¿Se puede anular o devolver un cobro por API? ¿Hasta cuándo? ¿La
comisión se devuelve?

**11. Límites de monto.** Mínimo y máximo por cobro y por día. *Con Yape por Mercado Pago
ya nos pasó que el mínimo documentado era falso: S/ 1 salió rechazado en producción.*

---

## Operación

**12. ¿Qué ve el cliente?** Cuando le cobramos con la autorización guardada, ¿le llega
notificación de Yape? ¿Qué nombre le aparece — "Transportes Rayza" o algo de GMoney? Es lo
que determina si nos llaman preguntando qué fue ese cargo.

**13. ¿Cómo revoca el cliente?** Desde la app de Yape, desde nosotros, o las dos. Y si
revoca desde Yape, **¿nos avisan?** Si no, nuestra pantalla va a mostrar una autorización
que ya no sirve.

**14. ¿Cuánto dura la autorización?** ¿Vence sola? ¿Hay que renovarla?

**15. Soporte.** A quién le escribimos cuando algo falla en producción, por qué canal y en
qué horario.

---

## El caso que nos importa de verdad

Conviene decírselo, porque cambia qué parte de su API necesitamos primero: **lo que nos
sirve es la encomienda que se paga en destino.** Hoy la tripulación cobra efectivo al
entregar y vuelve con esa plata encima. Con la autorización previa, el cobro se dispara al
entregar y nadie viaja con efectivo.

Eso implica dos cosas que vale la pena confirmar:

- El cobro se ejecuta **horas o días después** de la autorización, y a veces **desde un
  lugar con mala señal**. ¿La autorización sigue sirviendo? ¿Hay tiempo máximo entre
  autorizar y cobrar?
- Si el cobro falla en el momento de la entrega, ¿hay forma de reintentarlo más tarde sin
  volver a pedirle permiso al cliente?

---

## Después de la reunión

- Si trajeron la documentación: se escriben los dos métodos `PENDIENTE PROVEEDOR` y se
  prueba contra el sandbox.
- Correr `Backend/sql/autorizaciones-yape.sql` (ya se puede: el contrato está firmado).
- Encender `yape.onfile.enabled` **solo** cuando el sandbox pase de punta a punta,
  incluyendo un cobro repetido que no cobre dos veces.
