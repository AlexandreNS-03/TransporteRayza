package com.example.demo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Cliente de la pasarela de pagos Culqi (https://docs.culqi.com).
 * Crea un cargo a partir del token que genera Culqi.js en el navegador: el dato de
 * la tarjeta NUNCA pasa por aquí, solo llega el token (source_id).
 *
 * Configuración (secrets.properties / variables de entorno):
 *   culqi.enabled=true
 *   culqi.secret.key=sk_test_xxx   (o sk_live_xxx en producción)
 *
 * Si culqi.enabled=false → MODO SIMULACIÓN: no cobra y devuelve un id ficticio.
 */
@Service
public class CulqiService {

    private static final String CHARGES_URL = "https://api.culqi.com/v2/charges";

    @Value("${culqi.enabled:false}")
    private boolean enabled;

    @Value("${culqi.secret.key:}")
    private String secretKey;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Crea un cargo en Culqi.
     * @param sourceId    token de Culqi.js (tkn_...)
     * @param montoCents  monto en céntimos (S/ 10.00 = 1000)
     * @return id del cargo (chr_...) si fue aprobado
     */
    @SuppressWarnings("unchecked")
    public String crearCargo(String sourceId, int montoCents, String email, String descripcion) {
        if (montoCents < 300)
            throw new RuntimeException("El monto mínimo para pagar con tarjeta es S/ 3.00");

        if (!enabled || secretKey == null || secretKey.isBlank()) {
            System.out.println("[Culqi] MODO SIMULACIÓN — no se realizó un cobro real. Monto: " + montoCents);
            return "chr_simulado_" + UUID.randomUUID().toString().substring(0, 12);
        }

        if (sourceId == null || sourceId.isBlank())
            throw new RuntimeException("Falta el token de la tarjeta");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(secretKey);

        Map<String, Object> body = new HashMap<>();
        body.put("amount", montoCents);
        body.put("currency_code", "PEN");
        body.put("email", email);
        body.put("source_id", sourceId);
        body.put("description", descripcion);

        try {
            ResponseEntity<Map> resp = restTemplate.postForEntity(
                    CHARGES_URL, new HttpEntity<>(body, headers), Map.class);
            Map<String, Object> data = resp.getBody();
            if (data == null || data.get("id") == null)
                throw new RuntimeException("Respuesta inesperada de Culqi");
            return String.valueOf(data.get("id"));
        } catch (HttpStatusCodeException e) {
            throw new RuntimeException("El pago no se pudo procesar: " + extraerMensaje(e.getResponseBodyAsString()));
        } catch (Exception e) {
            throw new RuntimeException("Error de conexión con la pasarela de pago");
        }
    }

    private String extraerMensaje(String cuerpo) {
        if (cuerpo == null) return "intenta nuevamente";
        int i = cuerpo.indexOf("user_message");
        if (i >= 0) {
            int c = cuerpo.indexOf(':', i);
            int q1 = cuerpo.indexOf('"', c + 1);
            int q2 = cuerpo.indexOf('"', q1 + 1);
            if (q1 >= 0 && q2 > q1) return cuerpo.substring(q1 + 1, q2);
        }
        return "tarjeta rechazada o datos inválidos";
    }
}
