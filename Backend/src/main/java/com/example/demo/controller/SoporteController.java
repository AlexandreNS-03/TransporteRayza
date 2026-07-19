package com.example.demo.controller;

import com.example.demo.model.Notificacion;
import com.example.demo.service.SoporteService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/soporte")
@CrossOrigin(origins = "${app.frontend.url}")
public class SoporteController {

    private final SoporteService soporteService;

    public SoporteController(SoporteService soporteService) {
        this.soporteService = soporteService;
    }

    @GetMapping
    public ResponseEntity<List<Notificacion>> listar() {
        return ResponseEntity.ok(soporteService.listarReportes());
    }

    @PostMapping
    public ResponseEntity<Notificacion> reportar(@RequestBody Map<String, String> body,
                                                 Authentication auth) {
        return ResponseEntity.ok(soporteService.reportar(
                body.get("severidad"), body.get("asunto"), body.get("detalle"), auth.getName()));
    }

    @PatchMapping("/{id}/atendido")
    public ResponseEntity<Notificacion> atendido(@PathVariable String id) {
        return ResponseEntity.ok(soporteService.marcarAtendido(id));
    }
}
