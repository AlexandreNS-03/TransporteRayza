package com.example.demo.controller;

import com.example.demo.service.AuditoriaService;
import com.example.demo.service.MercadoPagoService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Notificaciones de Mercado Pago (servidor a servidor).
 *
 * El cobro con Yape se resuelve en el momento: cuando el cliente termina de pagar
 * ya sabemos si salió aprobado o no. Esta notificación sirve para lo que pasa
 * DESPUÉS —una devolución, un contracargo, una anulación—, que de otro modo solo
 * se vería entrando al panel de Mercado Pago.
 *
 * No se confía en lo que trae la notificación: solo se toma el id y el estado se
 * le vuelve a preguntar a la API. Así una notificación falsa no cambia nada.
 *
 * Se configura en el panel de Mercado Pago y en `mercadopago.notification-url`.
 */
@RestController
@RequestMapping("/api/public/mercadopago")
public class MercadoPagoWebhookController {

    private static final java.util.Set<String> ESTADOS_QUE_IMPORTAN =
            java.util.Set.of("refunded", "charged_back", "cancelled", "in_mediation");

    private final MercadoPagoService mercadoPagoService;
    private final AuditoriaService auditoriaService;

    public MercadoPagoWebhookController(MercadoPagoService mercadoPagoService,
                                        AuditoriaService auditoriaService) {
        this.mercadoPagoService = mercadoPagoService;
        this.auditoriaService = auditoriaService;
    }

    /**
     * Siempre responde 200: si devolviéramos error, Mercado Pago reintentaría una y
     * otra vez aunque el problema fuera nuestro. Lo que importa queda en el log y
     * en la auditoría.
     */
    /*
     * Mercado Pago tiene dos formas de avisar y las dos llegan acá:
     *
     *   Webhooks (la nueva)  → POST con JSON: {"type":"payment","data":{"id":"123"}}
     *   IPN (la antigua)     → POST con los datos en la URL: ?topic=payment&id=123,
     *                          muchas veces sin cuerpo y sin Content-Type de JSON.
     *
     * Por eso el cuerpo se recibe como texto y se interpreta a mano: pedirlo como
     * JSON hacía que el aviso del IPN se rechazara con "tipo de contenido no
     * soportado" antes de siquiera mirarlo, incluso el botón "Probar" del panel.
     */
    @PostMapping(consumes = MediaType.ALL_VALUE)
    public ResponseEntity<String> notificacion(@RequestBody(required = false) String cuerpo,
                                               @RequestParam(required = false) String topic,
                                               @RequestParam(required = false) String type,
                                               @RequestParam(required = false) String id,
                                               @RequestParam(name = "data.id", required = false) String dataId) {
        try {
            Map<String, Object> json = comoJson(cuerpo);
            procesar(primeroQueSirva(tipoDe(json), type, topic),
                     primeroQueSirva(pagoIdDe(json), dataId, id));
        } catch (Exception e) {
            System.err.println("[MercadoPago aviso] " + e.getMessage());
        }
        return ResponseEntity.ok("OK");
    }

    /** El cuerpo puede venir vacío, o no ser JSON: en ese caso no hay nada que leer. */
    @SuppressWarnings("unchecked")
    private Map<String, Object> comoJson(String cuerpo) {
        if (cuerpo == null || cuerpo.isBlank()) return null;
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(cuerpo, Map.class);
        } catch (Exception e) {
            return null;
        }
    }

    private String primeroQueSirva(String... valores) {
        for (String v : valores)
            if (v != null && !v.isBlank()) return v;
        return null;
    }

    private void procesar(String tipo, String pagoId) {
        if (tipo == null || pagoId == null) return;

        // Los contracargos vienen por un evento aparte, no por el del pago, y el id
        // que traen es el del contracargo: preguntarle a la API por un pago con ese
        // id no devolvería nada. Se deja el aviso para revisarlo en el panel, que es
        // donde está el detalle y desde donde se disputa.
        if (tipo.toLowerCase().contains("chargeback")) {
            System.out.println("[MercadoPago aviso] contracargo " + pagoId);
            auditoriaService.registrar("CONTRACARGO", "VENTAS", null,
                    "Mercado Pago informó un contracargo (" + pagoId + "). "
                            + "Revisar el detalle en el panel de Mercado Pago.");
            return;
        }

        if (!"payment".equals(tipo)) return;

        // El id de un pago es un número positivo. Preguntar por cualquier otra cosa
        // solo devuelve un 400 y llena el log de errores que no son problemas.
        if (!esIdDePago(pagoId)) {
            System.out.println("[MercadoPago aviso] id de pago ignorado: " + pagoId);
            return;
        }

        Map<String, Object> pago = mercadoPagoService.consultarPago(pagoId);
        if (pago == null) return;

        String estado = String.valueOf(pago.get("status"));
        String referencia = pago.get("external_reference") != null
                ? String.valueOf(pago.get("external_reference")) : null;

        System.out.println("[MercadoPago webhook] pago " + pagoId + " · estado " + estado
                + " · venta " + referencia);

        // Solo se deja rastro. Anular la venta se hace a mano desde el sistema:
        // una devolución en Mercado Pago no siempre significa que el pasajero no viajó.
        if (ESTADOS_QUE_IMPORTAN.contains(estado)) {
            auditoriaService.registrar("PAGO_WEBHOOK", "VENTAS", referencia,
                    "Mercado Pago informó el pago " + pagoId + " como '" + estado
                            + "'. Revisar la venta y anularla o devolverla si corresponde.");
        }
    }

    private boolean esIdDePago(String id) {
        try {
            return Long.parseLong(id.trim()) > 0;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    /** El tipo, cuando viene en el cuerpo: `type` en Webhooks, `topic` en IPN. */
    private String tipoDe(Map<String, Object> cuerpo) {
        if (cuerpo == null) return null;
        Object v = cuerpo.get("type") != null ? cuerpo.get("type") : cuerpo.get("topic");
        return v != null ? String.valueOf(v) : null;
    }

    /** El id del pago, cuando viene en el cuerpo: en `data.id` o suelto en `id`. */
    @SuppressWarnings("unchecked")
    private String pagoIdDe(Map<String, Object> cuerpo) {
        if (cuerpo == null) return null;
        if (cuerpo.get("data") instanceof Map<?, ?> data) {
            Object v = ((Map<String, Object>) data).get("id");
            if (v != null) return String.valueOf(v);
        }
        Object v = cuerpo.get("id");
        return v != null ? String.valueOf(v) : null;
    }
}
