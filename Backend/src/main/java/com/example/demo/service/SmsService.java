package com.example.demo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Mandar un SMS por Twilio.
 *
 * <p>Se habla con la API REST directamente y no con el SDK de Twilio a
 * propósito: lo único que se necesita es un POST con form-urlencoded y
 * autenticación básica. Una dependencia más en un repositorio público —y un
 * árbol de transitivas— por tres campos no se paga sola.
 *
 * <p><strong>El número va en E.164 o Twilio lo rechaza</strong>: "+51" delante y
 * nada más —ni espacios, ni guiones, ni el 0 de larga distancia—. La cuenta ya
 * guarda el código de país aparte, así que acá solo se limpia lo que la gente
 * escribe igual.
 *
 * <p><strong>Un SMS cuesta plata y no se puede deshacer.</strong> Por eso esta
 * clase no decide cuándo mandar: nada más manda. Quién puede recibir qué lo
 * decide {@link NotificacionesService#puedeRecibir}, y cada cuánto se puede
 * pedir un código lo decide {@link VerificacionCelularService}.
 */
@Service
public class SmsService {


    @Value("${notificaciones.sms.enabled:false}")
    private boolean habilitado;

    @Value("${twilio.account-sid:}")
    private String accountSid;

    @Value("${twilio.auth-token:}")
    private String authToken;

    /**
     * De dónde sale el mensaje: un número de Twilio en E.164 (+1...), o un
     * Messaging Service (empieza con MG), que es lo que conviene cuando hay más
     * de un número o remitente registrado.
     */
    @Value("${twilio.from:}")
    private String from;

    /** Se deja configurable solo para poder apuntarlo a un doble en las pruebas. */
    @Value("${twilio.endpoint:https://api.twilio.com}")
    private String endpoint;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper json = new ObjectMapper();

    /** ¿Está configurado de verdad? Encender el flag sin credenciales no cuenta. */
    public boolean estaActivo() {
        return habilitado && !accountSid.isBlank() && !authToken.isBlank() && !from.isBlank();
    }

    /**
     * Manda el mensaje.
     *
     * @return el SID del mensaje en Twilio, para poder rastrearlo en su panel
     * @throws RuntimeException si Twilio no lo aceptó. Se deja explotar a
     *         propósito: quien pidió un código tiene que enterarse de que no
     *         salió, no quedarse esperando un mensaje que nunca va a llegar.
     */
    public String enviar(String telefono, String texto) {
        if (!estaActivo())
            throw new RuntimeException("El envío de SMS no está configurado");

        String destino = aE164(telefono);
        if (destino == null)
            throw new RuntimeException("Ese número de celular no se entiende");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.set(HttpHeaders.AUTHORIZATION, "Basic " + Base64.getEncoder()
                .encodeToString((accountSid + ":" + authToken).getBytes(StandardCharsets.UTF_8)));

        MultiValueMap<String, String> cuerpo = new LinkedMultiValueMap<>();
        cuerpo.add("To", destino);
        // Un Messaging Service se manda en su propio campo; un número suelto va
        // en From. Mandarlo en el campo equivocado da un 400 que no explica nada.
        if (from.startsWith("MG")) cuerpo.add("MessagingServiceSid", from);
        else                       cuerpo.add("From", from);
        cuerpo.add("Body", texto);

        try {
            String respuesta = restTemplate.postForObject(
                    endpoint + "/2010-04-01/Accounts/" + accountSid + "/Messages.json",
                    new HttpEntity<>(cuerpo, headers), String.class);
            JsonNode n = json.readTree(respuesta == null ? "{}" : respuesta);
            return n.path("sid").asText(null);

        } catch (HttpStatusCodeException e) {
            // El mensaje de Twilio es bueno y conviene mostrarlo: dice, por
            // ejemplo, que una cuenta de prueba solo manda a números verificados.
            throw new RuntimeException("No se pudo enviar el mensaje: "
                    + motivo(e.getResponseBodyAsString()));
        } catch (RestClientException e) {
            // Va ANTES del rethrow de RuntimeException, y no después: las
            // excepciones de RestTemplate son RuntimeException, así que colarse
            // por ahí hacía que el cliente viera "I/O error on POST request for
            // http://.../Accounts/ACxxxx/Messages.json" — la URL interna y el SID
            // de la cuenta, en una pantalla pública.
            throw new RuntimeException("No se pudo conectar con el servicio de mensajes");
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("No se pudo conectar con el servicio de mensajes");
        }
    }

    /**
     * Deja el número como lo quiere Twilio: "+" y dígitos.
     *
     * <p>Se le saca el 0 de larga distancia que mucha gente escribe por
     * costumbre —"+51 065 965..."— porque con ese cero el mensaje no llega y el
     * error de Twilio no dice por qué.
     */
    static String aE164(String telefono) {
        if (telefono == null) return null;
        String limpio = telefono.replaceAll("[^0-9+]", "");
        if (!limpio.startsWith("+")) limpio = "+" + limpio;
        if (limpio.startsWith("+510")) limpio = "+51" + limpio.substring(4);

        String digitos = limpio.substring(1);
        if (digitos.length() < 8 || digitos.length() > 15) return null;   // E.164
        return limpio;
    }

    /** Twilio explica bien el error; conviene mostrar su mensaje y no uno genérico. */
    private String motivo(String cuerpo) {
        if (cuerpo == null || cuerpo.isBlank()) return "intenta de nuevo en un momento";
        try {
            JsonNode n = json.readTree(cuerpo);
            String m = n.path("message").asText("");
            if (!m.isBlank()) return m;
        } catch (Exception ignored) { }
        return "intenta de nuevo en un momento";
    }
}
