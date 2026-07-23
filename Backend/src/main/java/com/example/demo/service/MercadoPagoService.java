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

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Pago con Yape a través de Mercado Pago (Checkout API).
 *
 * El cliente escribe su celular y el código de aprobación de 6 dígitos que le da la
 * app de Yape; con eso el navegador genera un token con el SDK de Mercado Pago y este
 * servidor crea el pago. Ni el celular ni el código quedan guardados acá.
 *
 * Sin credenciales configuradas trabaja en MODO SIMULACIÓN, igual que Izipay.
 */
@Service
public class MercadoPagoService {

    private static final String PAGOS = "/v1/payments";

    @Value("${mercadopago.enabled:false}")
    private boolean enabled;

    /** Access token privado (APP_USR-… o TEST-…). Nunca debe llegar al navegador. */
    @Value("${mercadopago.access-token:}")
    private String accessToken;

    /** Clave pública, la única que puede viajar al navegador. */
    @Value("${mercadopago.public-key:}")
    private String publicKey;

    @Value("${mercadopago.endpoint:https://api.mercadopago.com}")
    private String endpoint;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper json = new ObjectMapper();

    public boolean estaActiva() {
        return enabled && !accessToken.isBlank() && !publicKey.isBlank();
    }

    public String getPublicKey() { return publicKey; }

    /** Resultado del cobro, con el mismo formato que usa la pasarela de tarjeta. */
    public static class Resultado {
        public boolean pagado;
        public String referencia;   // id del pago en Mercado Pago
        public String motivo;
    }

    /**
     * Cobra con Yape.
     *
     * @param token         token que generó el SDK a partir del celular y el código
     * @param idempotencia  clave para que un reintento no cobre dos veces; se usa el
     *                      id de la reserva, que es único por compra
     */
    public Resultado pagar(String token, BigDecimal monto, String descripcion,
                           String email, String idempotencia) {
        Resultado r = new Resultado();

        if (!estaActiva()) {
            System.out.println("[MercadoPago] MODO SIMULACIÓN — no se cobrará. Monto: " + monto);
            r.pagado = true;
            r.referencia = "yape_simulado_" + UUID.randomUUID().toString().substring(0, 12);
            return r;
        }

        if (token == null || token.isBlank()) {
            r.motivo = "Falta el código de aprobación de Yape";
            return r;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);
        headers.set("X-Idempotency-Key", idempotencia != null ? idempotencia : UUID.randomUUID().toString());

        Map<String, Object> pagador = new LinkedHashMap<>();
        pagador.put("email", email);

        Map<String, Object> cuerpo = new LinkedHashMap<>();
        cuerpo.put("token", token);
        cuerpo.put("transaction_amount", monto);
        cuerpo.put("description", descripcion);
        cuerpo.put("installments", 1);
        cuerpo.put("payment_method_id", "yape");
        cuerpo.put("payer", pagador);

        try {
            ResponseEntity<Map> resp = restTemplate.postForEntity(
                    endpoint + PAGOS, new HttpEntity<>(cuerpo, headers), Map.class);

            Map<String, Object> data = resp.getBody();
            String estado = data != null ? String.valueOf(data.get("status")) : "";

            if ("approved".equalsIgnoreCase(estado)) {
                r.pagado = true;
                r.referencia = String.valueOf(data.get("id"));
                return r;
            }
            // Yape se procesa como débito: o sale aprobado o sale rechazado
            r.motivo = motivoLegible(data != null ? String.valueOf(data.get("status_detail")) : null);
            return r;

        } catch (HttpStatusCodeException e) {
            r.motivo = extraerMensaje(e.getResponseBodyAsString());
            return r;
        } catch (Exception e) {
            r.motivo = "Error de conexión con Yape";
            return r;
        }
    }

    /** Traduce los códigos de Mercado Pago a algo que el pasajero entienda. */
    private String motivoLegible(String statusDetail) {
        if (statusDetail == null) return "El pago con Yape fue rechazado";
        return switch (statusDetail) {
            case "cc_rejected_insufficient_amount" -> "Saldo insuficiente en tu Yape";
            case "cc_rejected_call_for_authorize"  -> "Yape pide que autorices este pago desde la app";
            case "cc_rejected_bad_filled_security_code",
                 "cc_rejected_bad_filled_other"    -> "El código de aprobación no es correcto";
            case "cc_rejected_max_attempts"        -> "Demasiados intentos. Genera un código nuevo en Yape";
            default -> "El pago con Yape fue rechazado";
        };
    }

    private String extraerMensaje(String cuerpo) {
        if (cuerpo == null || cuerpo.isBlank()) return "El pago con Yape no se pudo procesar";
        try {
            JsonNode n = json.readTree(cuerpo);
            String m = n.path("message").asText("");
            if (!m.isBlank()) return m;
            JsonNode causas = n.path("cause");
            if (causas.isArray() && causas.size() > 0) {
                String d = causas.get(0).path("description").asText("");
                if (!d.isBlank()) return d;
            }
        } catch (Exception ignored) { }
        return "El pago con Yape no se pudo procesar";
    }
}
