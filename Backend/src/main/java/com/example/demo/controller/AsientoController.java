package com.example.demo.controller;

import com.example.demo.dto.AsientoDTO;
import com.example.demo.service.AsientoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/viajes/{viajeId}/asientos")
@CrossOrigin(origins = "http://localhost:5173")
public class AsientoController {

    private final AsientoService asientoService;

    public AsientoController(AsientoService asientoService) {
        this.asientoService = asientoService;
    }

    // Todos los asientos del viaje
    @GetMapping
    public ResponseEntity<List<AsientoDTO>> listar(@PathVariable String viajeId) {
        return ResponseEntity.ok(asientoService.listarPorViaje(viajeId));
    }

    // Asientos libres para un tramo
    @GetMapping("/libres")
    public ResponseEntity<List<AsientoDTO>> libres(
            @PathVariable String viajeId,
            @RequestParam int ordenOrigen,
            @RequestParam int ordenDestino) {
        return ResponseEntity.ok(
                asientoService.listarLibresPorTramo(viajeId, ordenOrigen, ordenDestino)
        );
    }
}