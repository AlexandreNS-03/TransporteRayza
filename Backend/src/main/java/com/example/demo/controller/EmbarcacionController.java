package com.example.demo.controller;

import com.example.demo.dto.EmbarcacionDTO;
import com.example.demo.dto.EmbarcacionRequest;
import com.example.demo.model.EmbarcacionAsiento;
import com.example.demo.service.EmbarcacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.demo.repository.EmbarcacionAsientoRepository;

import java.util.List;

@RestController
@RequestMapping("/api/embarcaciones")
@CrossOrigin(origins = "${app.frontend.url}")
public class EmbarcacionController {

    private final EmbarcacionService embarcacionService;

    public EmbarcacionController(EmbarcacionService embarcacionService) {
        this.embarcacionService = embarcacionService;
    }

    @Autowired
    private EmbarcacionAsientoRepository embarcacionAsientoRepository;

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

    // EmbarcacionController.java
    @GetMapping("/{id}/asientos")
    public ResponseEntity<List<EmbarcacionAsiento>> getAsientos(@PathVariable String id) {
        System.out.println("Buscando asientos para: " + id); // ← debe imprimir "suc_ray"
        List<EmbarcacionAsiento> asientos = embarcacionAsientoRepository
                .findByEmbarcacionIdOrderByNumeroAsc(id);
        System.out.println("Encontrados: " + asientos.size()); // ← cuántos trajo
        return ResponseEntity.ok(asientos);
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