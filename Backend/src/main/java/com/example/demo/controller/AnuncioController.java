package com.example.demo.controller;

import com.example.demo.dto.AnuncioDTO;
import com.example.demo.dto.AnuncioRequest;
import com.example.demo.service.AnuncioService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** CRUD de anuncios (barra, modal y landing de la web pública), solo ADMIN. */
@RestController
@RequestMapping("/api/anuncios")
@CrossOrigin(origins = "${app.frontend.url}")
public class AnuncioController {

    private final AnuncioService anuncioService;

    public AnuncioController(AnuncioService anuncioService) {
        this.anuncioService = anuncioService;
    }

    @GetMapping
    public ResponseEntity<List<AnuncioDTO>> listar() {
        return ResponseEntity.ok(anuncioService.listarTodos());
    }

    @PostMapping
    public ResponseEntity<AnuncioDTO> crear(@RequestBody AnuncioRequest req) {
        return ResponseEntity.ok(anuncioService.crear(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AnuncioDTO> editar(@PathVariable String id, @RequestBody AnuncioRequest req) {
        return ResponseEntity.ok(anuncioService.editar(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable String id) {
        anuncioService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
