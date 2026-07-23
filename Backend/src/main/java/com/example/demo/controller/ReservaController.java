package com.example.demo.controller;

import com.example.demo.dto.ConfirmacionDTO;
import com.example.demo.dto.ReservaRequest;
import com.example.demo.dto.ReservaResponse;
import com.example.demo.service.ReservaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Reserva y pago en línea (público). Permite compra como invitado; si el cliente está
 * autenticado (rol CLIENTE), la compra queda asociada a su cuenta.
 */
@RestController
@RequestMapping("/api/public/reservas")
public class ReservaController {

    private final ReservaService reservaService;

    public ReservaController(ReservaService reservaService) {
        this.reservaService = reservaService;
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleError(RuntimeException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", e.getMessage()));
    }

    @PostMapping
    public ResponseEntity<ReservaResponse> reservar(@RequestBody ReservaRequest req,
                                                    Authentication auth) {
        String email = (auth != null) ? auth.getName() : null;
        return ResponseEntity.ok(reservaService.crearReserva(req, email));
    }

    /**
     * Medios de pago disponibles y las claves públicas que necesita el navegador.
     * Se consulta antes de elegir: así no se pide un formulario a Izipay cuando el
     * cliente va a pagar con Yape, y no quedan órdenes abandonadas en la pasarela.
     */
    @GetMapping("/metodos-de-pago")
    public ResponseEntity<?> metodosDePago() {
        return ResponseEntity.ok(reservaService.metodosDePago());
    }

    /** Paso previo del pago con tarjeta: pide a Izipay el formulario de esta reserva. */
    @PostMapping("/{id}/pago/formulario")
    public ResponseEntity<?> formularioDePago(@PathVariable String id) {
        return ResponseEntity.ok(reservaService.prepararPago(id));
    }

    /**
     * Confirma el pago con lo que devolvió el formulario de Izipay. No recibe datos de
     * tarjeta: solo la respuesta firmada, que el servidor verifica antes de dar la
     * venta por pagada.
     */
    /** Pago con Yape: el navegador manda el token que generó el SDK de Mercado Pago. */
    @PostMapping("/{id}/pagar/yape")
    public ResponseEntity<ConfirmacionDTO> pagarYape(@PathVariable String id,
                                                     @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(reservaService.pagarConYape(id, body.get("token")));
    }

    @PostMapping("/{id}/pagar")
    public ResponseEntity<ConfirmacionDTO> pagar(@PathVariable String id,
                                                 @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
                reservaService.pagarReserva(id, body.get("krAnswer"), body.get("krHash")));
    }
}
