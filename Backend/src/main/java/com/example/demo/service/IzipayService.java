package com.example.demo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Pasarela de pagos Izipay (Perú), formulario embebido.
 *
 * El flujo tiene dos pasos y es distinto al de un cobro directo:
 *
 *   1. El servidor pide un formToken a Izipay con el monto y los datos del comprador.
 *   2. El navegador dibuja el formulario de Izipay con ese token; la tarjeta NUNCA
 *      pasa por este servidor.
 *   3. Al pagar, el navegador devuelve kr-answer + kr-hash y el servidor verifica la
 *      firma HMAC-SHA256 antes de dar la venta por pagada. Sin esa verificación,
 *      cualquiera podría declarar un pago que no ocurrió.
 *
 * Sin credenciales configuradas trabaja en MODO SIMULACIÓN: no cobra y da el pago por
 * bueno, para poder probar el resto del sistema.
 */
@Service
public class IzipayService {

    private static final String CREATE_PAYMENT = "/api-payment/V4/Charge/CreatePayment";

    /**
     * Devolver plata ya cobrada. Izipay elige sola entre anular y reembolsar
     * según si el lote del día ya cerró (`resolutionMode: AUTO`), que es
     * justamente lo que desde acá no se puede saber.
     */
    private static final String CANCEL_OR_REFUND = "/api-payment/V4/Transaction/CancelOrRefund";

    /** El uuid de una transacción de Izipay son 32 caracteres hexadecimales, siempre. */
    private static final int LARGO_UUID = 32;

    @Value("${izipay.enabled:false}")
    private boolean enabled;

    /** Identificador de la tienda (USERNAME en el Back Office). */
    @Value("${izipay.username:}")
    private String username;

    /** Clave de test o de producción (PASSWORD). */
    @Value("${izipay.password:}")
    private String password;

    /** Clave pública, la única que puede viajar al navegador. */
    @Value("${izipay.public-key:}")
    private String publicKey;

    /** Clave HMAC-SHA256 con la que se firma la respuesta del navegador. */
    @Value("${izipay.hmac-sha256:}")
    private String hmacSha256;

    @Value("${izipay.endpoint:https://api.micuentaweb.pe}")
    private String endpoint;

    /*
     * Con tiempos de espera. Un RestTemplate recién hecho NO tiene ninguno: si
     * Izipay acepta la conexión y después se queda callada, el hilo espera para
     * siempre. En el cobro eso deja a alguien mirando una pantalla; en la
     * devolución es peor, porque esa llamada ocurre con una transacción de base
     * de datos abierta y la fila de la venta queda trabada mientras tanto.
     * Treinta segundos es largo para una pasarela y corto para un candado.
     */
    private final RestTemplate restTemplate = crearRestTemplate();
    private final ObjectMapper json = new ObjectMapper();

    private static RestTemplate crearRestTemplate() {
        var fabrica = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        fabrica.setConnectTimeout(10_000);
        fabrica.setReadTimeout(30_000);
        return new RestTemplate(fabrica);
    }

    public boolean estaActiva() {
        return enabled && !username.isBlank() && !password.isBlank() && !publicKey.isBlank();
    }

    /** Datos que necesita el navegador para dibujar el formulario. */
    public static class Formulario {
        private String formToken;
        private String publicKey;
        private boolean simulado;

        public String getFormToken() { return formToken; }
        public String getPublicKey() { return publicKey; }
        public boolean isSimulado() { return simulado; }
    }

    /**
     * Pide el formToken a Izipay.
     *
     * @param montoCents monto en céntimos (Izipay cobra en la unidad menor)
     */
    public Formulario crearFormulario(String orderId, int montoCents, String email,
                                      String nombre, String documento, String telefono) {
        if (montoCents < 100)
            throw new RuntimeException("El monto mínimo para pagar con tarjeta es S/ 1.00");

        Formulario f = new Formulario();
        f.publicKey = publicKey;

        if (!estaActiva()) {
            System.out.println("[Izipay] MODO SIMULACIÓN — no se cobrará. Monto: " + montoCents);
            f.formToken = "SIMULADO-" + UUID.randomUUID();
            f.simulado = true;
            return f;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(HttpHeaders.AUTHORIZATION, "Basic " + Base64.getEncoder()
                .encodeToString((username + ":" + password).getBytes(StandardCharsets.UTF_8)));

        Map<String, Object> facturacion = new LinkedHashMap<>();
        facturacion.put("firstName", nombre);
        facturacion.put("identityType", "DNI");
        facturacion.put("identityCode", documento);
        facturacion.put("phoneNumber", telefono);
        facturacion.put("country", "PE");

        Map<String, Object> cliente = new LinkedHashMap<>();
        cliente.put("email", email);
        cliente.put("billingDetails", facturacion);

        Map<String, Object> cuerpo = new LinkedHashMap<>();
        cuerpo.put("amount", montoCents);
        cuerpo.put("currency", "PEN");
        cuerpo.put("orderId", orderId);
        cuerpo.put("customer", cliente);

        try {
            ResponseEntity<Map> resp = restTemplate.postForEntity(
                    endpoint + CREATE_PAYMENT, new HttpEntity<>(cuerpo, headers), Map.class);

            Map<String, Object> data = resp.getBody();
            if (data == null || !"SUCCESS".equals(data.get("status")))
                throw new RuntimeException(mensajeDeError(data));

            Map<String, Object> answer = (Map<String, Object>) data.get("answer");
            Object token = answer != null ? answer.get("formToken") : null;
            if (token == null) throw new RuntimeException("Izipay no devolvió el formulario de pago");

            f.formToken = String.valueOf(token);
            return f;

        } catch (HttpStatusCodeException e) {
            throw new RuntimeException("No se pudo abrir el pago: " + resumen(e.getResponseBodyAsString()));
        } catch (RestClientException e) {
            // Va ANTES del rethrow de RuntimeException: las excepciones de
            // RestTemplate son RuntimeException, así que con Izipay inalcanzable
            // el comprador veía "I/O error on POST request for
            // https://api.micuentaweb.pe/..." en vez de un aviso.
            throw new RuntimeException("Error de conexión con la pasarela de pago");
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Error de conexión con la pasarela de pago");
        }
    }

    /** Cómo le fue a la devolución. Nunca lanza: el que llama decide qué hacer. */
    public static class Devolucion {
        /** ¿Izipay devolvió la plata? Si es false, hay que hacerlo a mano. */
        public boolean hecha;
        /** Sin credenciales no se cobró nada, así que tampoco hay qué devolver. */
        public boolean simulado;
        /** Lo que terminó haciendo Izipay, para que quede escrito en la auditoría. */
        public String operacion;
        /** El uuid que deja la operación, si lo devuelve. */
        public String referencia;
        /** Por qué no se pudo, en palabras que le sirvan a quien está en el mostrador. */
        public String motivo;
    }

    /**
     * Le pide a Izipay que devuelva una venta ya cobrada.
     *
     * <p>Es lo que reemplaza entrar al Back Office a mano. Se le manda el uuid
     * de la transacción —el mismo que se guardó en `pasarelaReferencia` al
     * cobrar— y el monto <strong>de este pasaje</strong>, que no siempre es el
     * de la transacción: una compra web puede haber sido de cuatro pasajes en
     * un solo cobro y acá se está devolviendo uno.
     *
     * <p><strong>Límite conocido, y no es un error nuestro:</strong> una
     * devolución PARCIAL solo se puede hacer después de que cierre el lote del
     * día. Antes de eso la transacción está autorizada pero no presentada, y lo
     * único que Izipay permite es anularla entera. O sea: cancelar uno de
     * cuatro pasajes el mismo día en que se compraron va a fallar, y hay que
     * hacerlo desde el Back Office. Cuando pasa, el mensaje lo dice.
     *
     * <p>Nunca lanza una excepción. Devolver plata es demasiado delicado para
     * que el que llama se entere por un `catch`: tiene que mirar el resultado y
     * decidir, porque de eso depende si registra un egreso de caja o no.
     */
    public Devolucion reembolsar(String uuidTransaccion, int montoCents, String comentario) {
        Devolucion d = new Devolucion();

        if (!estaActiva()) {
            // En simulación nunca hubo cobro de verdad: dar la devolución por
            // hecha es lo coherente, igual que el cobro se da por bueno.
            d.hecha = true;
            d.simulado = true;
            d.operacion = "SIMULADO";
            return d;
        }

        if (uuidTransaccion == null || uuidTransaccion.trim().length() != LARGO_UUID) {
            // Pasa con ventas viejas: si al cobrar Izipay no mandó transacción,
            // `verificarPago` guardaba el orderId como referencia. Con eso no se
            // puede devolver, y conviene decirlo en vez de inventar una llamada.
            d.motivo = "Esta venta no tiene la referencia de la transacción de Izipay";
            return d;
        }
        if (montoCents <= 0) {
            d.motivo = "El monto a devolver no es válido";
            return d;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(HttpHeaders.AUTHORIZATION, "Basic " + Base64.getEncoder()
                .encodeToString((username + ":" + password).getBytes(StandardCharsets.UTF_8)));

        Map<String, Object> cuerpo = new LinkedHashMap<>();
        cuerpo.put("uuid", uuidTransaccion.trim());
        cuerpo.put("amount", montoCents);
        cuerpo.put("currency", "PEN");
        cuerpo.put("resolutionMode", "AUTO");
        if (comentario != null && !comentario.isBlank())
            cuerpo.put("comment", comentario.length() > 255 ? comentario.substring(0, 255) : comentario);

        try {
            ResponseEntity<Map> resp = restTemplate.postForEntity(
                    endpoint + CANCEL_OR_REFUND, new HttpEntity<>(cuerpo, headers), Map.class);

            Map<String, Object> data = resp.getBody();
            if (data == null || !"SUCCESS".equals(data.get("status"))) {
                d.motivo = mensajeDeError(data);
                return d;
            }

            d.hecha = true;
            // El detalle es "lo bueno a saber", no "lo necesario": si Izipay
            // cambia la forma de la respuesta, la devolución igual se hizo.
            if (data.get("answer") instanceof Map<?, ?> a) {
                Object estado = a.get("detailedStatus");
                Object uuid = a.get("uuid");
                d.operacion = estado != null ? String.valueOf(estado) : "DEVUELTO";
                if (uuid != null) d.referencia = String.valueOf(uuid);
            } else {
                d.operacion = "DEVUELTO";
            }
            return d;

        } catch (HttpStatusCodeException e) {
            d.motivo = resumen(e.getResponseBodyAsString());
            return d;
        } catch (RestClientException e) {
            // Igual que en el cobro: el mensaje de RestTemplate trae la URL
            // completa adentro y eso no va a una pantalla del mostrador.
            d.motivo = "No se pudo conectar con Izipay";
            return d;
        } catch (Exception e) {
            d.motivo = "No se pudo completar la devolución en Izipay";
            return d;
        }
    }

    /** Resultado de verificar lo que devolvió el navegador. */
    public static class Resultado {
        public boolean pagado;
        public String referencia;   // uuid de la transacción en Izipay
        public String motivo;

        /**
         * Lo que Izipay dice que se cobró, en céntimos, y para qué pedido.
         *
         * Vienen de dentro de la firma, así que no se pueden tocar desde el
         * navegador. Importan cuando lo que se paga es plata que después queda
         * guardada —una recarga de la wallet—: sin comparar el monto, se paga
         * S/ 1 y se pide acreditar S/ 1000.
         */
        public Integer montoCents;
        public String orderId;

        /** En modo simulación no hay monto que comparar porque no hubo cobro. */
        public boolean simulado;
    }

    /**
     * Verifica la firma de la respuesta y que el pedido esté realmente pagado.
     * La firma es lo que impide que alguien invente un pago desde la consola.
     */
    public Resultado verificarPago(String krAnswer, String krHash) {
        Resultado r = new Resultado();

        if (!estaActiva()) {
            r.pagado = true;
            r.simulado = true;
            r.referencia = "izipay_simulado_" + UUID.randomUUID().toString().substring(0, 12);
            return r;
        }

        if (krAnswer == null || krHash == null) {
            r.motivo = "La pasarela no devolvió la confirmación del pago";
            return r;
        }
        if (!firmaValida(krAnswer, krHash)) {
            r.motivo = "La confirmación del pago no es auténtica";
            return r;
        }

        try {
            JsonNode a = json.readTree(krAnswer);
            String estado = a.path("orderStatus").asText("");
            if (!"PAID".equalsIgnoreCase(estado)) {
                r.motivo = "El pago quedó en estado " + (estado.isBlank() ? "desconocido" : estado);
                return r;
            }
            r.pagado = true;
            r.referencia = a.path("transactions").isArray() && a.path("transactions").size() > 0
                    ? a.path("transactions").get(0).path("uuid").asText(null)
                    : a.path("orderDetails").path("orderId").asText(null);
            leerMontoYPedido(a, r);
            return r;
        } catch (Exception e) {
            r.motivo = "No se pudo leer la respuesta de la pasarela";
            return r;
        }
    }

    /**
     * Verifica una notificación IPN (servidor a servidor).
     *
     * Ojo con la llave: en la respuesta del navegador Izipay firma con la clave
     * HMAC-SHA256, pero en el IPN firma con la CONTRASEÑA de la tienda. Cuál usó
     * viene en el campo kr-hash-key, y confundirlas es el error típico que hace
     * que el IPN "no valide".
     */
    public Resultado verificarIpn(String krAnswer, String krHash, String krHashKey) {
        Resultado r = new Resultado();

        if (krAnswer == null || krHash == null) {
            r.motivo = "Notificación incompleta";
            return r;
        }
        String llave = "password".equalsIgnoreCase(krHashKey) ? password : hmacSha256;
        if (llave == null || llave.isBlank()) {
            r.motivo = "Falta configurar la llave para validar la notificación";
            return r;
        }
        if (!firmaValidaCon(krAnswer, krHash, llave)) {
            r.motivo = "La notificación no es auténtica";
            return r;
        }

        try {
            JsonNode a = json.readTree(krAnswer);
            String estado = a.path("orderStatus").asText("");
            r.pagado = "PAID".equalsIgnoreCase(estado);
            if (!r.pagado) r.motivo = "Pago en estado " + estado;
            r.referencia = a.path("transactions").isArray() && a.path("transactions").size() > 0
                    ? a.path("transactions").get(0).path("uuid").asText(null) : null;
            leerMontoYPedido(a, r);
            return r;
        } catch (Exception e) {
            r.motivo = "No se pudo leer la notificación";
            return r;
        }
    }

    /**
     * Valida solo la firma de una notificación, sin exigir que el pago esté aprobado.
     * Lo usa el aviso de abandono, donde el pedido justamente NO está pagado.
     */
    public boolean firmaIpnValida(String krAnswer, String krHash, String krHashKey) {
        if (!estaActiva()) return true;                       // modo simulación
        if (krAnswer == null || krHash == null) return false;
        String llave = "password".equalsIgnoreCase(krHashKey) ? password : hmacSha256;
        if (llave == null || llave.isBlank()) return false;
        return firmaValidaCon(krAnswer, krHash, llave);
    }

    /** Devuelve el orderId que viene dentro de la notificación. */
    public String orderIdDe(String krAnswer) {
        try {
            return json.readTree(krAnswer).path("orderDetails").path("orderId").asText(null);
        } catch (Exception e) { return null; }
    }

    /**
     * Saca de la respuesta firmada cuánto se cobró y para qué pedido.
     *
     * El monto se busca primero en la transacción, que es lo que de verdad pasó
     * por la tarjeta, y recién después en el total del pedido.
     */
    private static void leerMontoYPedido(JsonNode a, Resultado r) {
        r.orderId = a.path("orderDetails").path("orderId").asText(null);

        JsonNode txs = a.path("transactions");
        if (txs.isArray() && txs.size() > 0 && txs.get(0).hasNonNull("amount"))
            r.montoCents = txs.get(0).path("amount").asInt();
        else if (a.path("orderDetails").hasNonNull("orderTotalAmount"))
            r.montoCents = a.path("orderDetails").path("orderTotalAmount").asInt();
    }

    /** HMAC-SHA256 del cuerpo tal cual llegó, comparado en hexadecimal. */
    private boolean firmaValida(String krAnswer, String krHash) {
        return firmaValidaCon(krAnswer, krHash, hmacSha256);
    }

    private boolean firmaValidaCon(String krAnswer, String krHash, String llave) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(llave.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] firma = mac.doFinal(krAnswer.getBytes(StandardCharsets.UTF_8));

            StringBuilder hex = new StringBuilder(firma.length * 2);
            for (byte b : firma) hex.append(String.format("%02x", b));

            // Comparación de tiempo constante: no revela dónde difiere
            return java.security.MessageDigest.isEqual(
                    hex.toString().getBytes(StandardCharsets.UTF_8),
                    krHash.trim().getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            return false;
        }
    }

    private String mensajeDeError(Map<String, Object> data) {
        if (data == null) return "respuesta vacía de la pasarela";
        Object answer = data.get("answer");
        if (answer instanceof Map<?, ?> m) {
            Object detalle = m.get("errorMessage");
            if (detalle != null) return String.valueOf(detalle);
        }
        return "la pasarela rechazó la solicitud";
    }

    private String resumen(String cuerpo) {
        if (cuerpo == null || cuerpo.isBlank()) return "intenta nuevamente";
        try {
            JsonNode n = json.readTree(cuerpo);
            String m = n.path("answer").path("errorMessage").asText("");
            if (!m.isBlank()) return m;
        } catch (Exception ignored) { }
        return cuerpo.length() > 120 ? cuerpo.substring(0, 120) : cuerpo;
    }
}
