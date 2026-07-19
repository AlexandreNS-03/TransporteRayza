package com.example.demo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Consulta datos de DNI y RUC a través de apisperu (dniruc.apisperu.com).
 * El token vive en secrets.properties y nunca se expone al navegador.
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
        if (token == null || token.isBlank())
            throw new RuntimeException("La consulta de documentos no está configurada");

        Map<String, Object> resp;
        try {
            resp = restTemplate.getForObject(BASE + "/dni/" + dni + "?token=" + token, Map.class);
        } catch (Exception e) {
            throw new RuntimeException("No se pudo consultar el DNI en este momento");
        }
        if (resp == null || resp.get("nombres") == null)
            throw new RuntimeException("No se encontraron datos para el DNI " + dni);

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
        if (token == null || token.isBlank())
            throw new RuntimeException("La consulta de documentos no está configurada");

        Map<String, Object> resp;
        try {
            resp = restTemplate.getForObject(BASE + "/ruc/" + ruc + "?token=" + token, Map.class);
        } catch (Exception e) {
            throw new RuntimeException("No se pudo consultar el RUC en este momento");
        }
        if (resp == null || resp.get("razonSocial") == null)
            throw new RuntimeException("No se encontraron datos para el RUC " + ruc);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("tipo", "RUC");
        out.put("numero", ruc);
        out.put("razonSocial", str(resp.get("razonSocial")));
        out.put("direccion", str(resp.get("direccion")));
        out.put("estado", str(resp.get("estado")));
        out.put("condicion", str(resp.get("condicion")));
        return out;
    }

    private String str(Object o) { return o != null ? o.toString().trim() : ""; }
}
