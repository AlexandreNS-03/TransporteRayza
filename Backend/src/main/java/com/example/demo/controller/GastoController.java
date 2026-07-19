package com.example.demo.controller;

import com.example.demo.dto.GastoRequest;
import com.example.demo.model.Gasto;
import com.example.demo.service.GastoService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/gastos")
@CrossOrigin(origins = "${app.frontend.url}")
public class GastoController {

    private final GastoService gastoService;

    public GastoController(GastoService gastoService) {
        this.gastoService = gastoService;
    }

    @GetMapping
    public ResponseEntity<List<Gasto>> listar() {
        return ResponseEntity.ok(gastoService.listar());
    }

    @PostMapping
    public ResponseEntity<Gasto> crear(@RequestBody GastoRequest req, Authentication auth) {
        return ResponseEntity.ok(gastoService.crear(req, auth.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable String id) {
        gastoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
