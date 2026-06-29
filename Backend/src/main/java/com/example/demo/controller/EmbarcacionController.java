package com.example.demo.controller;

import com.example.demo.dto.EmbarcacionDTO;
import com.example.demo.dto.EmbarcacionRequest;
import com.example.demo.service.EmbarcacionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/embarcaciones")
@CrossOrigin(origins = "http://localhost:5173")
public class EmbarcacionController {

    private final EmbarcacionService embarcacionService;

    public EmbarcacionController(EmbarcacionService embarcacionService) {
        this.embarcacionService = embarcacionService;
    }

    @GetMapping
    public ResponseEntity<List<EmbarcacionDTO>> listar() {
        return ResponseEntity.ok(embarcacionService.listarTodas());
    }

    @GetMapping("/activas")
    public ResponseEntity<List<EmbarcacionDTO>> activas() {
        return ResponseEntity.ok(embarcacionService.listarActivas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmbarcacionDTO> obtener(@PathVariable String id) {
        return ResponseEntity.ok(embarcacionService.obtener(id));
    }

    @PostMapping
    public ResponseEntity<EmbarcacionDTO> crear(@RequestBody EmbarcacionRequest req) {
        return ResponseEntity.ok(embarcacionService.crear(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmbarcacionDTO> editar(@PathVariable String id,
                                                 @RequestBody EmbarcacionRequest req) {
        return ResponseEntity.ok(embarcacionService.editar(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desactivar(@PathVariable String id) {
        embarcacionService.desactivar(id);
        return ResponseEntity.noContent().build();
    }
}