package com.example.demo.controller;

import com.example.demo.service.AuditoriaService;
import com.example.demo.service.MercadoPagoService;
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
    @PostMapping
    public ResponseEntity<String> notificacion(@RequestBody(required = false) Map<String, Object> cuerpo,
                                               @RequestParam(required = false) String topic,
                                               @RequestParam(required = false) String id) {
        try {
            procesar(tipoDe(cuerpo, topic), pagoIdDe(cuerpo, id));
        } catch (Exception e) {
            System.err.println("[MercadoPago webhook] " + e.getMessage());
        }
        return ResponseEntity.ok("OK");
    }

    private void procesar(String tipo, String pagoId) {
        if (!"payment".equals(tipo) || pagoId == null) return;

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

    /** El tipo llega como `type` en el cuerpo o como `topic` en la URL, según la versión. */
    private String tipoDe(Map<String, Object> cuerpo, String topic) {
        if (cuerpo != null && cuerpo.get("type") != null) return String.valueOf(cuerpo.get("type"));
        return topic;
    }

    /** El id del pago viene en `data.id` del cuerpo o como `id` en la URL. */
    @SuppressWarnings("unchecked")
    private String pagoIdDe(Map<String, Object> cuerpo, String id) {
        if (cuerpo != null && cuerpo.get("data") instanceof Map<?, ?> data) {
            Object v = ((Map<String, Object>) data).get("id");
            if (v != null) return String.valueOf(v);
        }
        return id;
    }
}
