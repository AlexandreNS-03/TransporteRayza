package com.example.demo.controller;

import com.example.demo.dto.ReclamacionDTO;
import com.example.demo.service.ReclamacionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Libro de Reclamaciones virtual.
 *
 * Registrar es PÚBLICO y a propósito: la norma exige que el consumidor pueda dejar
 * su hoja en el mismo medio donde se le vendió, sin cuenta ni trámite previo. Por
 * eso cuelga de /api/public.
 *
 * Leer las hojas y responderlas sí es del personal: van bajo /api/reclamaciones,
 * que exige sesión.
 */
@RestController
public class ReclamacionController {

    private final ReclamacionService servicio;

    public ReclamacionController(ReclamacionService servicio) {
        this.servicio = servicio;
    }

    /** Registra una hoja y devuelve la copia con su número correlativo. */
    @PostMapping("/api/public/reclamaciones")
    public ResponseEntity<ReclamacionDTO> registrar(@RequestBody ReclamacionDTO req) {
        return ResponseEntity.ok(servicio.registrar(req));
    }

    /** Todas las hojas, para el personal. */
    @GetMapping("/api/reclamaciones")
    public ResponseEntity<List<ReclamacionDTO>> listar() {
        return ResponseEntity.ok(servicio.listar());
    }

    /** Registra la respuesta del proveedor. La hoja original no se modifica. */
    @PatchMapping("/api/reclamaciones/{id}/responder")
    public ResponseEntity<ReclamacionDTO> responder(@PathVariable String id,
                                                    @RequestBody Map<String, String> body,
                                                    Authentication authentication) {
        return ResponseEntity.ok(
                servicio.responder(id, body.get("respuesta"), authentication.getName()));
    }
}
