package com.example.demo.service;

import com.example.demo.model.Comprobante;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Arma el JSON con el formato que exige la API de Nubefact
 * (https://www.nubefact.com/integracion) y, si nubefact.enabled=true,
 * lo envía a la ruta configurada con el token de autorización.
 */
@Service
public class NubefactService {

    @Value("${nubefact.enabled:false}")
    private boolean enabled;

    @Value("${nubefact.url:}")
    private String url;

    @Value("${nubefact.token:}")
    private String token;

    private final RestTemplate restTemplate = new RestTemplate();

    public boolean isEnabled() { return enabled; }

    // Códigos Nubefact: 1 = FACTURA, 2 = BOLETA, 3 = NOTA DE CRÉDITO
    private int codigoTipo(Comprobante.TipoComprobante tipo) {
        return switch (tipo) {
            case FACTURA -> 1;
            case BOLETA -> 2;
            case NOTA_CREDITO -> 3;
        };
    }

    /** JSON de emisión: operacion generar_comprobante */
    public Map<String, Object> construirJsonEmision(Comprobante c) {
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("operacion", "generar_comprobante");
        json.put("tipo_de_comprobante", codigoTipo(c.getTipoDeComprobante()));
        json.put("serie", c.getSerie());
        json.put("numero", c.getNumero());
        json.put("sunat_transaction", 1);
        json.put("cliente_tipo_de_documento", c.getClienteTipoDeDocumento());
        json.put("cliente_numero_de_documento", c.getClienteNumeroDeDocumento());
        json.put("cliente_denominacion", c.getClienteDenominacion());
        json.put("cliente_direccion", c.getClienteDireccion() != null ? c.getClienteDireccion() : "");
        json.put("cliente_email", c.getClienteEmail() != null ? c.getClienteEmail() : "");
        json.put("fecha_de_emision", c.getFechaDeEmision().toString());
        json.put("moneda", c.getMoneda());
        json.put("porcentaje_de_igv", c.getPorcentajeDeIgv());
        // Operación exonerada de IGV — Ley 27037 (Amazonía): todo el monto va en total_exonerada
        json.put("total_gravada", BigDecimal.ZERO);
        json.put("total_exonerada", c.getTotalExonerada());
        json.put("total_igv", BigDecimal.ZERO);
        json.put("total", c.getTotal());
        json.put("enviar_automaticamente_a_la_sunat", true);
        json.put("enviar_automaticamente_al_cliente", c.getClienteEmail() != null && !c.getClienteEmail().isBlank());

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("unidad_de_medida", "ZZ"); // ZZ = servicio
        item.put("codigo", "PASAJE");
        item.put("descripcion", c.getDescripcion());
        item.put("cantidad", 1);
        item.put("valor_unitario", c.getTotal()); // exonerado: valor = precio (sin IGV)
        item.put("precio_unitario", c.getTotal());
        item.put("subtotal", c.getTotal());
        item.put("tipo_de_igv", 8); // 8 = Exonerado - Operación Onerosa
        item.put("igv", BigDecimal.ZERO);
        item.put("total", c.getTotal());
        item.put("anticipo_regularizacion", false);
        json.put("items", List.of(item));

        // Nota de crédito: referencia al documento que modifica y motivo SUNAT
        if (c.getTipoDeComprobante() == Comprobante.TipoComprobante.NOTA_CREDITO && c.getRefSerie() != null) {
            // La serie referenciada indica el tipo: F... = factura (1), B... = boleta (2)
            int tipoRef = c.getRefSerie().startsWith("F") ? 1 : 2;
            json.put("documento_que_se_modifica_tipo", tipoRef);
            json.put("documento_que_se_modifica_serie", c.getRefSerie());
            json.put("documento_que_se_modifica_numero", c.getRefNumero());
            json.put("tipo_de_nota_de_credito", 1); // 1 = Anulación de la operación
        }

        return json;
    }

    /** JSON de anulación: operacion generar_anulacion */
    public Map<String, Object> construirJsonAnulacion(Comprobante c, String motivo) {
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("operacion", "generar_anulacion");
        json.put("tipo_de_comprobante", codigoTipo(c.getTipoDeComprobante()));
        json.put("serie", c.getSerie());
        json.put("numero", c.getNumero());
        json.put("motivo", motivo);
        json.put("codigo_unico", "");
        return json;
    }

    /**
     * Envía el JSON a Nubefact. Devuelve el cuerpo de la respuesta,
     * o null si la integración está deshabilitada (modo local).
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> enviar(Map<String, Object> json) {
        if (!enabled) return null;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Token token=\"" + token + "\"");

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(json, headers);
        ResponseEntity<Map> respuesta = restTemplate.postForEntity(url, entity, Map.class);

        Map<String, Object> body = respuesta.getBody();
        if (body != null && body.get("errors") != null) {
            throw new RuntimeException("Nubefact rechazó el comprobante: " + body.get("errors"));
        }
        return body;
    }
}
