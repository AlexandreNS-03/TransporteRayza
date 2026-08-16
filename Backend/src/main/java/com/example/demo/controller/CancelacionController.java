package com.example.demo.controller;

import com.example.demo.dto.VentaDTO;
import com.example.demo.model.SaldoMovimiento;
import com.example.demo.model.Viaje;
import com.example.demo.service.CancelacionService;
import com.example.demo.service.VentaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** Cancelación de viajes y resolución de los pasajes afectados. */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "${app.frontend.url}")
public class CancelacionController {

    private final CancelacionService cancelacionService;
    private final VentaService ventaService;

    public CancelacionController(CancelacionService cancelacionService, VentaService ventaService) {
        this.cancelacionService = cancelacionService;
        this.ventaService = ventaService;
    }

    @PatchMapping("/viajes/{id}/cancelar")
    public ResponseEntity<Viaje> cancelar(@PathVariable String id,
                                          @RequestBody Map<String, String> body,
                                          Authentication auth) {
        return ResponseEntity.ok(cancelacionService.cancelarViaje(id, body.get("motivo"), auth.getName()));
    }

    /** Pasajes de viajes cancelados que todavía nadie resolvió. */
    @GetMapping("/ventas/por-resolver")
    public ResponseEntity<List<VentaDTO>> porResolver() {
        return ResponseEntity.ok(cancelacionService.pendientesDeResolver()
                .stream().map(ventaService::aDTO).toList());
    }

    @PatchMapping("/ventas/{id}/devolver")
    public ResponseEntity<VentaDTO> devolver(@PathVariable String id, Authentication auth) {
        return ResponseEntity.ok(ventaService.aDTO(cancelacionService.devolver(id, auth.getName())));
    }

    @PatchMapping("/ventas/{id}/saldo-favor")
    public ResponseEntity<VentaDTO> saldoAFavor(@PathVariable String id, Authentication auth) {
        return ResponseEntity.ok(ventaService.aDTO(cancelacionService.dejarSaldoAFavor(id, auth.getName())));
    }

    @PatchMapping("/ventas/{id}/reprogramar")
    public ResponseEntity<VentaDTO> reprogramar(@PathVariable String id,
                                             @RequestBody Map<String, Object> body,
                                             Authentication auth) {
        Object a = body.get("asientoNumero");
        Integer asiento = a == null ? null : Integer.valueOf(String.valueOf(a));
        return ResponseEntity.ok(ventaService.aDTO(cancelacionService.reprogramar(
                id, String.valueOf(body.get("viajeId")), asiento, auth.getName())));
    }

    /** Saldo a favor de un cliente (por correo). */
    @GetMapping("/saldo/{email}")
    public ResponseEntity<Map<String, Object>> saldo(@PathVariable String email) {
        BigDecimal s = cancelacionService.saldoDe(email);
        List<SaldoMovimiento> movs = cancelacionService.movimientosDe(email);
        return ResponseEntity.ok(Map.of("saldo", s, "movimientos", movs));
    }
}
