package com.example.demo.controller;

import com.example.demo.dto.EncomiendaRequest;
import com.example.demo.model.Encomienda;
import com.example.demo.service.EncomiendaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/encomiendas")
@CrossOrigin(origins = "${app.frontend.url}")
public class EncomiendaController {

    private final EncomiendaService encomiendaService;

    public EncomiendaController(EncomiendaService encomiendaService) {
        this.encomiendaService = encomiendaService;
    }

    @GetMapping
    public ResponseEntity<List<Encomienda>> listar() {
        return ResponseEntity.ok(encomiendaService.listar());
    }

    @PostMapping
    public ResponseEntity<Encomienda> crear(@RequestBody EncomiendaRequest req, Authentication auth) {
        return ResponseEntity.ok(encomiendaService.crear(req, auth.getName()));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<Encomienda> cambiarEstado(@PathVariable String id,
                                                    @RequestBody Map<String, String> body,
                                                    Authentication auth) {
        return ResponseEntity.ok(encomiendaService.cambiarEstado(id, body.get("estado"), auth.getName()));
    }
}
