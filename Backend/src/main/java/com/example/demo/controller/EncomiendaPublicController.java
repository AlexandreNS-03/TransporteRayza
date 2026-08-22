package com.example.demo.controller;

import com.example.demo.dto.EncomiendaPublicDTO;
import com.example.demo.service.EncomiendaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Rastreo público de encomiendas (sin login). Va bajo /api/public/** que ya es
 * de acceso abierto en la configuración de seguridad.
 */
@RestController
@RequestMapping("/api/public/encomiendas")
public class EncomiendaPublicController {

    private final EncomiendaService encomiendaService;

    public EncomiendaPublicController(EncomiendaService encomiendaService) {
        this.encomiendaService = encomiendaService;
    }

    @GetMapping("/rastrear/{codigo}")
    public ResponseEntity<EncomiendaPublicDTO> rastrearPorCodigo(@PathVariable String codigo) {
        return ResponseEntity.ok(encomiendaService.rastrearPorCodigo(codigo));
    }

    @GetMapping("/remitente/{documento}")
    public ResponseEntity<List<EncomiendaPublicDTO>> rastrearPorRemitente(@PathVariable String documento) {
        return ResponseEntity.ok(encomiendaService.rastrearPorRemitente(documento));
    }

    @GetMapping("/destinatario/{documento}")
    public ResponseEntity<List<EncomiendaPublicDTO>> rastrearPorDestinatario(@PathVariable String documento) {
        return ResponseEntity.ok(encomiendaService.rastrearPorDestinatario(documento));
    }

    // ── Pago en línea de la encomienda ──

    /** Paso previo del pago con tarjeta: formulario de Izipay para esta encomienda. */
    @PostMapping("/{codigo}/pago/formulario")
    public ResponseEntity<?> formularioDePago(@PathVariable String codigo) {
        return ResponseEntity.ok(encomiendaService.prepararPagoEncomienda(codigo));
    }

    /** Confirma el pago con tarjeta. */
    @PostMapping("/{codigo}/pagar")
    public ResponseEntity<EncomiendaPublicDTO> pagar(@PathVariable String codigo,
                                                     @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(encomiendaService.pagarEncomiendaTarjeta(codigo,
                (String) body.get("krAnswer"), (String) body.get("krHash")));
    }

    /** Confirma el pago con Yape. */
    @PostMapping("/{codigo}/pagar/yape")
    public ResponseEntity<EncomiendaPublicDTO> pagarYape(@PathVariable String codigo,
                                                         @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(encomiendaService.pagarEncomiendaYape(codigo,
                (String) body.get("token"), (String) body.get("deviceId")));
    }
}
