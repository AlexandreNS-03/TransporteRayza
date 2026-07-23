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

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper json = new ObjectMapper();

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
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Error de conexión con la pasarela de pago");
        }
    }

    /** Resultado de verificar lo que devolvió el navegador. */
    public static class Resultado {
        public boolean pagado;
        public String referencia;   // uuid de la transacción en Izipay
        public String motivo;
    }

    /**
     * Verifica la firma de la respuesta y que el pedido esté realmente pagado.
     * La firma es lo que impide que alguien invente un pago desde la consola.
     */
    public Resultado verificarPago(String krAnswer, String krHash) {
        Resultado r = new Resultado();

        if (!estaActiva()) {
            r.pagado = true;
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
            return r;
        } catch (Exception e) {
            r.motivo = "No se pudo leer la respuesta de la pasarela";
            return r;
        }
    }

    /** HMAC-SHA256 del cuerpo tal cual llegó, comparado en hexadecimal. */
    private boolean firmaValida(String krAnswer, String krHash) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(hmacSha256.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
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
