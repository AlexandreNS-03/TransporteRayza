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

    @PostMapping("/{id}/pagar")
    public ResponseEntity<ConfirmacionDTO> pagar(@PathVariable String id,
                                                 @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
                reservaService.pagarReserva(id, body.get("token"), body.get("email")));
    }
}
