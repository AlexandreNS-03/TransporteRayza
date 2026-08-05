package com.example.demo.controller;

import com.example.demo.dto.VentaDTO;
import com.example.demo.model.SaldoMovimiento;
import com.example.demo.service.CancelacionService;
import com.example.demo.service.VentaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Lo que el cliente puede hacer por su cuenta cuando le cancelan un viaje:
 * ver su saldo a favor, reprogramar el pasaje o guardarlo como saldo.
 * Va bajo /api/cliente/** (rol CLIENTE) y cada acción valida que el pasaje
 * sea realmente suyo.
 */
@RestController
@RequestMapping("/api/cliente")
@CrossOrigin(origins = "${app.frontend.url}")
public class ClienteCancelacionController {

    private final CancelacionService cancelacionService;
    private final VentaService ventaService;

    public ClienteCancelacionController(CancelacionService cancelacionService, VentaService ventaService) {
        this.cancelacionService = cancelacionService;
        this.ventaService = ventaService;
    }

    /** Saldo a favor y sus movimientos. */
    @GetMapping("/saldo")
    public ResponseEntity<Map<String, Object>> saldo(Authentication auth) {
        BigDecimal s = cancelacionService.saldoDe(auth.getName());
        List<SaldoMovimiento> movs = cancelacionService.movimientosDe(auth.getName());
        return ResponseEntity.ok(Map.of("saldo", s, "movimientos", movs));
    }

    /** Pasajes suyos que quedaron por resolver tras cancelarse el viaje. */
    @GetMapping("/por-resolver")
    public ResponseEntity<List<VentaDTO>> porResolver(Authentication auth) {
        return ResponseEntity.ok(cancelacionService.misPendientes(auth.getName())
                .stream().map(ventaService::aDTO).toList());
    }

    @PatchMapping("/pasajes/{id}/saldo-favor")
    public ResponseEntity<VentaDTO> guardarSaldo(@PathVariable String id, Authentication auth) {
        return ResponseEntity.ok(ventaService.aDTO(
                cancelacionService.clienteGuardaSaldo(id, auth.getName())));
    }

    @PatchMapping("/pasajes/{id}/reprogramar")
    public ResponseEntity<VentaDTO> reprogramar(@PathVariable String id,
                                                @RequestBody Map<String, String> body,
                                                Authentication auth) {
        return ResponseEntity.ok(ventaService.aDTO(
                cancelacionService.clienteReprograma(id, body.get("viajeId"), auth.getName())));
    }
}
