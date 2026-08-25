package com.example.demo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Consulta datos de DNI y RUC a través de apisperu (dniruc.apisperu.com).
 * El token vive en la variable APISPERU_TOKEN y nunca se expone al navegador.
 *
 * Ojo con esta API: responde 500 con un texto suelto ante casi cualquier problema
 * —token vencido, sin saldo, documento inexistente— en vez de distinguirlos con el
 * código HTTP. Por eso lo que llega se registra crudo en el log: antes cualquier
 * fallo se convertía en "no se pudo consultar" sin dejar rastro, y no había forma
 * de saber si el token había vencido o si el servicio estaba caído.
 */
@Service
public class ConsultaDocumentoService {

    @Value("${apisperu.token:}")
    private String token;

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String BASE = "https://dniruc.apisperu.com/api/v1";

    /** Devuelve {tipo, numero, nombreCompleto, nombres, apellidoPaterno, apellidoMaterno}. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> consultarDni(String dni) {
        if (!dni.matches("\\d{8}"))
            throw new RuntimeException("El DNI debe tener 8 dígitos");
        exigirToken();

        Map<String, Object> resp = pedir("/dni/" + dni, "DNI");

        if (resp == null || resp.get("nombres") == null)
            throw new RuntimeException(sinResultado(resp, "DNI", dni));

        String nombres = str(resp.get("nombres"));
        String apePat  = str(resp.get("apellidoPaterno"));
        String apeMat  = str(resp.get("apellidoMaterno"));
        String completo = (nombres + " " + apePat + " " + apeMat).trim().replaceAll("\\s+", " ");

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("tipo", "DNI");
        out.put("numero", dni);
        out.put("nombreCompleto", completo);
        out.put("nombres", nombres);
        out.put("apellidoPaterno", apePat);
        out.put("apellidoMaterno", apeMat);
        return out;
    }

    /** Devuelve {tipo, numero, razonSocial, direccion, estado, condicion}. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> consultarRuc(String ruc) {
        if (!ruc.matches("\\d{11}"))
            throw new RuntimeException("El RUC debe tener 11 dígitos");
        exigirToken();

        Map<String, Object> resp = pedir("/ruc/" + ruc, "RUC");

        if (resp == null || resp.get("razonSocial") == null)
            throw new RuntimeException(sinResultado(resp, "RUC", ruc));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("tipo", "RUC");
        out.put("numero", ruc);
        out.put("razonSocial", str(resp.get("razonSocial")));
        out.put("direccion", str(resp.get("direccion")));
        out.put("estado", str(resp.get("estado")));
        out.put("condicion", str(resp.get("condicion")));
        return out;
    }

    private void exigirToken() {
        if (token == null || token.isBlank()) {
            System.err.println("[Consulta] APISPERU_TOKEN está vacío: la consulta de documentos no puede funcionar");
            throw new RuntimeException("La consulta de documentos no está configurada. "
                    + "Avisa a soporte: falta la clave del servicio.");
        }
    }

    /**
     * Hace la llamada y deja en el log lo que respondió de verdad.
     *
     * El token no se registra nunca, ni siquiera recortado: va en la URL y basta un
     * pedazo para que alguien lo reconstruya si lo tiene a medias en otro lado.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> pedir(String ruta, String queEs) {
        try {
            return restTemplate.getForObject(BASE + ruta + "?token=" + token, Map.class);

        } catch (HttpStatusCodeException e) {
            int codigo = e.getStatusCode().value();
            String cuerpo = recortar(e.getResponseBodyAsString());
            System.err.println("[Consulta " + queEs + "] apisperu respondió " + codigo + ": " + cuerpo);

            // apisperu manda 401/403 cuando el token venció o se acabó el saldo, que
            // es lo que más pasa: la cuenta gratuita caduca y nadie se entera.
            if (codigo == 401 || codigo == 403)
                throw new RuntimeException("La clave del servicio de consulta venció o no es válida. "
                        + "Escribe el nombre a mano y avisa a soporte.");
            if (codigo == 429)
                throw new RuntimeException("El servicio de consulta llegó a su límite por ahora. "
                        + "Escribe el nombre a mano.");

            throw new RuntimeException("El servicio de consulta de " + queEs
                    + " no está respondiendo. Escribe el nombre a mano.");

        } catch (Exception e) {
            System.err.println("[Consulta " + queEs + "] falló la llamada a apisperu: " + e);
            throw new RuntimeException("No se pudo conectar con el servicio de consulta de " + queEs
                    + ". Escribe el nombre a mano.");
        }
    }

    /**
     * Vino respuesta pero sin los datos esperados. Puede ser un documento que no
     * existe o un aviso del servicio (token, saldo) devuelto con código 200.
     */
    private String sinResultado(Map<String, Object> resp, String queEs, String numero) {
        Object aviso = resp == null ? null
                : (resp.get("message") != null ? resp.get("message") : resp.get("error"));
        System.err.println("[Consulta " + queEs + "] sin datos para " + numero
                + (aviso != null ? " — el servicio dijo: " + recortar(aviso.toString()) : ""));

        return "No se encontraron datos para el " + queEs + " " + numero;
    }

    private String recortar(String s) {
        if (s == null) return "(vacío)";
        String limpio = s.replaceAll("\\s+", " ").trim();
        return limpio.length() > 200 ? limpio.substring(0, 200) + "…" : limpio;
    }

    private String str(Object o) { return o != null ? o.toString().trim() : ""; }
}
