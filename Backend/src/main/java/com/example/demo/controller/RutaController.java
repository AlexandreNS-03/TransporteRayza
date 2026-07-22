package com.example.demo.controller;

import com.example.demo.dto.RutaDTO;
import com.example.demo.dto.RutaRequest;
import com.example.demo.service.RutaService;
import com.example.demo.service.TarifaCsvService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;

import java.util.List;

@RestController
@RequestMapping("/api/rutas")
@CrossOrigin(origins = "${app.frontend.url}")
public class RutaController {

    private final RutaService rutaService;
    private final TarifaCsvService tarifaCsvService;

    public RutaController(RutaService rutaService, TarifaCsvService tarifaCsvService) {
        this.rutaService = rutaService;
        this.tarifaCsvService = tarifaCsvService;
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

    /** Plantilla CSV con todos los pares origen→destino, para llenar precios en Excel. */
    @GetMapping("/{id}/tarifas/plantilla")
    public ResponseEntity<byte[]> plantillaTarifas(@PathVariable String id) {
        byte[] csv = tarifaCsvService.generarPlantilla(id).getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"tarifas-" + id + ".csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csv);
    }

    @PostMapping("/{id}/tarifas/importar")
    public ResponseEntity<?> importarTarifas(@PathVariable String id,
                                             @RequestParam("archivo") MultipartFile archivo)
            throws java.io.IOException {
        if (archivo == null || archivo.isEmpty())
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "Elige un archivo"));
        return ResponseEntity.ok(tarifaCsvService.importar(id, archivo.getInputStream()));
    }
}