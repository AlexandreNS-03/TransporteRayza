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

    /** Lo que le sale al cliente en el resumen de su cuenta. Máximo 22 caracteres. */
    private static final String DESCRIPTOR = "TRANSPORTES RAYZA";

    /*
     * Tope de Yape en Perú, publicado por Mercado Pago:
     * https://www.mercadopago.com.pe/ayuda/monto-minimo-maximo-medios-de-pago_2491
     */
    private static final BigDecimal YAPE_MAXIMO = new BigDecimal("2000.00");

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

    /**
     * URL pública donde Mercado Pago avisa de cambios en el pago (contracargos,
     * devoluciones). Si queda vacía no se envía y el cobro funciona igual, pero
     * nos enteraríamos de esos casos solo entrando al panel de Mercado Pago.
     */
    @Value("${mercadopago.notification-url:}")
    private String urlNotificacion;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper json = new ObjectMapper();

    public boolean estaActiva() {
        return enabled && !accessToken.isBlank() && !publicKey.isBlank();
    }

    public String getPublicKey() { return publicKey; }

    /** Las credenciales de prueba de Mercado Pago empiezan con TEST-. */
    public boolean esDePrueba() {
        return estaActiva() && accessToken.startsWith("TEST-");
    }

    /** Resultado del cobro, con el mismo formato que usa la pasarela de tarjeta. */
    public static class Resultado {
        public boolean pagado;
        public String referencia;   // id del pago en Mercado Pago
        public String motivo;
    }

    /**
     * Datos de quien paga.
     *
     * Mercado Pago los usa para decidir si aprueba el cobro: mientras más completo
     * va este objeto, menos rechazos por "no pasó los controles de seguridad".
     * Antes solo se mandaba el correo, y varios pagos legítimos caían ahí.
     *
     * Todos los campos son opcionales: lo que venga vacío no se envía.
     */
    public static class Pagador {
        public String email;
        public String nombre;         // nombre completo; se parte en first_name / last_name
        public String tipoDocumento;  // DNI, CE, RUC…
        public String documento;
        public String telefono;

        public static Pagador de(String email, String nombre, String tipoDocumento,
                                 String documento, String telefono) {
            Pagador p = new Pagador();
            p.email = email;
            p.nombre = nombre;
            p.tipoDocumento = tipoDocumento;
            p.documento = documento;
            p.telefono = telefono;
            return p;
        }
    }

    /**
     * Cobra con Yape.
     *
     * @param token             token que generó el SDK a partir del celular y el código
     * @param pagador           datos del comprador para el control antifraude
     * @param idempotencia      clave para que un reintento no cobre dos veces; se usa el
     *                          id de la reserva, que es único por compra
     * @param referenciaExterna id nuestro de la venta o del grupo. Va en external_reference
     *                          y es lo que permite cruzar un pago de Mercado Pago con la
     *                          venta del sistema cuando hay que conciliar.
     * @param deviceId          huella del navegador que genera el script de seguridad de
     *                          Mercado Pago. Viaja en la cabecera X-meli-session-id y es
     *                          el dato que más pesa en la aprobación; si falta, se cobra
     *                          igual pero con más riesgo de rechazo.
     */
    public Resultado pagar(String token, BigDecimal monto, String descripcion,
                           Pagador pagador, String idempotencia,
                           String referenciaExterna, String deviceId) {
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

        String problemaDelMonto = revisarMonto(monto);
        if (problemaDelMonto != null) {
            System.out.println("[MercadoPago] no se intenta cobrar: monto " + monto + " fuera de rango");
            r.motivo = problemaDelMonto;
            return r;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);
        headers.set("X-Idempotency-Key", idempotencia != null ? idempotencia : UUID.randomUUID().toString());
        if (noVacio(deviceId)) headers.set("X-meli-session-id", deviceId);
        else System.out.println("[MercadoPago] sin device id — el pago va con menos respaldo antifraude");

        Pagador p = pagador != null ? pagador : new Pagador();
        String[] partes = partirNombre(p.nombre);

        Map<String, Object> datosPagador = new LinkedHashMap<>();
        ponSiHay(datosPagador, "email", p.email);
        ponSiHay(datosPagador, "first_name", partes[0]);
        ponSiHay(datosPagador, "last_name", partes[1]);
        if (noVacio(p.documento)) {
            Map<String, Object> doc = new LinkedHashMap<>();
            doc.put("type", tipoDocumentoMp(p.tipoDocumento));
            doc.put("number", p.documento.trim());
            datosPagador.put("identification", doc);
        }
        Map<String, Object> telefono = telefonoMp(p.telefono);
        if (telefono != null) datosPagador.put("phone", telefono);

        Map<String, Object> cuerpo = new LinkedHashMap<>();
        cuerpo.put("token", token);
        cuerpo.put("transaction_amount", monto);
        cuerpo.put("description", descripcion);
        cuerpo.put("installments", 1);
        cuerpo.put("payment_method_id", "yape");
        cuerpo.put("payer", datosPagador);
        ponSiHay(cuerpo, "external_reference", referenciaExterna);
        ponSiHay(cuerpo, "notification_url", urlNotificacion);
        // Lo que le aparece al cliente en su resumen: sin esto el cobro sale con un
        // nombre que no reconoce y termina en desconocimiento o contracargo.
        cuerpo.put("statement_descriptor", DESCRIPTOR);
        cuerpo.put("additional_info", infoAdicional(monto, descripcion, datosPagador, telefono, partes));

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
            // Yape se procesa como débito: o sale aprobado o sale rechazado.
            // Se registra el motivo crudo porque los códigos que no están mapeados
            // llegan al cliente como un genérico y sin esto no hay cómo saber cuál fue.
            String detalle = data != null ? String.valueOf(data.get("status_detail")) : null;
            System.out.println("[MercadoPago] pago no aprobado — status: " + estado
                    + " · status_detail: " + detalle
                    + " · pago: " + (data != null ? data.get("id") : null));
            r.motivo = motivoLegible(detalle);
            return r;

        } catch (HttpStatusCodeException e) {
            System.out.println("[MercadoPago] la API rechazó el cobro de " + monto);
            r.motivo = extraerMensaje(e.getResponseBodyAsString());
            return r;
        } catch (Exception e) {
            r.motivo = "Error de conexión con Yape";
            return r;
        }
    }

    /**
     * additional_info es lo que Mercado Pago mira para puntuar el riesgo del cobro.
     * Repite al pagador y describe qué se está comprando.
     */
    private Map<String, Object> infoAdicional(BigDecimal monto, String descripcion,
                                              Map<String, Object> datosPagador,
                                              Map<String, Object> telefono, String[] nombre) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", "pasaje");
        item.put("title", "Pasaje fluvial");
        item.put("description", descripcion);
        item.put("category_id", "travels");
        item.put("quantity", 1);
        item.put("unit_price", monto);

        Map<String, Object> pagador = new LinkedHashMap<>();
        ponSiHay(pagador, "first_name", nombre[0]);
        ponSiHay(pagador, "last_name", nombre[1]);
        if (telefono != null) pagador.put("phone", telefono);

        Map<String, Object> info = new LinkedHashMap<>();
        info.put("items", java.util.List.of(item));
        if (!pagador.isEmpty()) info.put("payer", pagador);
        return info;
    }

    /**
     * Parte "JUAN PEREZ GARCIA" en nombre y apellidos. Con una sola palabra, el
     * apellido queda vacío y simplemente no se manda.
     */
    String[] partirNombre(String completo) {
        if (!noVacio(completo)) return new String[]{null, null};
        String limpio = completo.trim().replaceAll("\\s+", " ");
        int corte = limpio.indexOf(' ');
        if (corte < 0) return new String[]{limpio, null};
        return new String[]{limpio.substring(0, corte), limpio.substring(corte + 1)};
    }

    /** Mercado Pago Perú espera DNI, CE o RUC; cualquier otra cosa se manda como DNI. */
    String tipoDocumentoMp(String tipo) {
        if (!noVacio(tipo)) return "DNI";
        String t = tipo.trim().toUpperCase();
        return switch (t) {
            case "RUC" -> "RUC";
            case "CE", "CARNET_EXTRANJERIA", "CARNET DE EXTRANJERIA" -> "CE";
            default -> "DNI";
        };
    }

    /** El celular peruano va partido: código de área 51 y los 9 dígitos. */
    Map<String, Object> telefonoMp(String telefono) {
        if (!noVacio(telefono)) return null;
        String digitos = telefono.replaceAll("\\D", "");
        if (digitos.startsWith("51") && digitos.length() > 9) digitos = digitos.substring(2);
        if (digitos.length() < 6) return null;
        Map<String, Object> t = new LinkedHashMap<>();
        t.put("area_code", "51");
        t.put("number", digitos);
        return t;
    }

    private static boolean noVacio(String s) { return s != null && !s.trim().isEmpty(); }

    private static void ponSiHay(Map<String, Object> destino, String clave, String valor) {
        if (noVacio(valor)) destino.put(clave, valor.trim());
    }

    /**
     * Consulta un pago en Mercado Pago. Se usa desde el webhook: la notificación
     * solo trae el id, y el estado real hay que pedírselo a la API — así una
     * notificación falsa no puede cambiar nada por sí sola.
     *
     * @return los datos del pago, o null si no se pudo consultar
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> consultarPago(String pagoId) {
        if (!estaActiva() || pagoId == null || pagoId.isBlank()) return null;
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            ResponseEntity<Map> resp = restTemplate.exchange(
                    endpoint + PAGOS + "/" + pagoId,
                    org.springframework.http.HttpMethod.GET,
                    new HttpEntity<>(headers), Map.class);
            return resp.getBody();
        } catch (Exception e) {
            System.err.println("[MercadoPago] no se pudo consultar el pago " + pagoId + ": " + e.getMessage());
            return null;
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
            // Lo rechaza el control antifraude de Mercado Pago, no Yape ni el saldo:
            // reintentar con el mismo dato vuelve a fallar, así que se ofrece salida.
            case "cc_rejected_high_risk",
                 "rejected_high_risk"              -> "Mercado Pago no aprobó este pago por seguridad. "
                                                    + "Intenta con tarjeta o paga en la oficina.";
            case "cc_rejected_blacklist"           -> "Mercado Pago no permite este pago. "
                                                    + "Intenta con tarjeta o paga en la oficina.";
            default -> "El pago con Yape fue rechazado";
        };
    }

    /**
     * Errores de la API que sí conviene explicar en castellano. El resto se
     * registra crudo en el log pero al cliente se le da un mensaje genérico:
     * "Invalid value for transaction_amount" no le dice nada a quien está
     * comprando un pasaje, y llegaba tal cual a la pantalla.
     */
    /**
     * Revisa el monto antes de gastar un intento: que exista y que no pase el tope
     * de Yape. Sin mínimo propio —lo del piso lo decide Mercado Pago— para no
     * bloquear montos que en realidad sí acepta.
     *
     * @return el motivo a mostrar, o null si el monto sirve
     */
    private String revisarMonto(BigDecimal monto) {
        if (monto == null || monto.signum() <= 0)
            return "No se pudo calcular el precio de este pasaje. Avísanos antes de pagar.";
        if (monto.compareTo(YAPE_MAXIMO) > 0)
            return "Yape solo acepta pagos de hasta S/ 2,000 y este suma S/ " + monto
                 + ". Paga con tarjeta, o compra los pasajes en grupos más pequeños.";
        return null;
    }

    private String enCastellano(String mensajeApi) {
        if (mensajeApi == null) return null;
        String m = mensajeApi.toLowerCase();
        if (m.contains("transaction_amount"))
            return "Yape no aceptó el monto de esta compra. Paga con tarjeta o en la oficina.";
        if (m.contains("token") && (m.contains("invalid") || m.contains("not found")))
            return "El código de aprobación no es válido o ya venció. "
                 + "Genera uno nuevo en tu app de Yape e intenta otra vez.";
        if (m.contains("payer") || m.contains("email"))
            return "Revisa el correo que ingresaste y vuelve a intentar.";
        return null;   // desconocido: se responde el genérico
    }

    private String extraerMensaje(String cuerpo) {
        if (cuerpo == null || cuerpo.isBlank()) return "El pago con Yape no se pudo procesar";
        try {
            JsonNode n = json.readTree(cuerpo);
            String m = n.path("message").asText("");
            if (!m.isBlank()) {
                System.out.println("[MercadoPago] error de la API: " + m);
                String traducido = enCastellano(m);
                return traducido != null ? traducido : "El pago con Yape no se pudo procesar";
            }
            JsonNode causas = n.path("cause");
            if (causas.isArray() && causas.size() > 0) {
                String d = causas.get(0).path("description").asText("");
                if (!d.isBlank()) return d;
            }
        } catch (Exception ignored) { }
        return "El pago con Yape no se pudo procesar";
    }
}
