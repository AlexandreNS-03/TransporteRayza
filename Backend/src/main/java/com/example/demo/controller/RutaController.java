package com.example.demo.controller;

import com.example.demo.dto.RutaDTO;
import com.example.demo.dto.RutaRequest;
import com.example.demo.service.RutaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rutas")
@CrossOrigin(origins = "${app.frontend.url}")
public class RutaController {

    private final RutaService rutaService;

    public RutaController(RutaService rutaService) {
        this.rutaService = rutaService;
    }

    @GetMapping
    public ResponseEntity<List<RutaDTO>> listar() {
        return ResponseEntity.ok(rutaService.listarTodas());
    }

    @GetMapping("/activas")
    public ResponseEntity<List<RutaDTO>> activas() {
        return ResponseEntity.ok(rutaService.listarActivas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RutaDTO> obtener(@PathVariable String id) {
        return ResponseEntity.ok(rutaService.obtener(id));
    }

    @PostMapping
    public ResponseEntity<RutaDTO> crear(@RequestBody RutaRequest req) {
        return ResponseEntity.ok(rutaService.crear(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RutaDTO> editar(@PathVariable String id,
                                          @RequestBody RutaRequest req) {
        return ResponseEntity.ok(rutaService.editar(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desactivar(@PathVariable String id) {
        rutaService.desactivar(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/tarifa")
    public ResponseEntity<?> obtenerTarifa(
            @PathVariable String id,
            @RequestParam int ordenOrigen,
            @RequestParam int ordenDestino) {
        return ResponseEntity.ok(rutaService.obtenerTarifa(id, ordenOrigen, ordenDestino));
    }

}
