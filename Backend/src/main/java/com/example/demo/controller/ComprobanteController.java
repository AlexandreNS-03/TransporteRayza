package com.example.demo.controller;

import com.example.demo.dto.AnularComprobanteRequest;
import com.example.demo.dto.ComprobanteDTO;
import com.example.demo.dto.ComprobanteRequest;
import com.example.demo.service.ComprobanteService;
import com.example.demo.service.ComprobantesPendientesService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/comprobantes")
@CrossOrigin(origins = "${app.frontend.url}")
public class ComprobanteController {

    private final ComprobanteService comprobanteService;
    private final ComprobantesPendientesService comprobantesPendientesService;

    public ComprobanteController(ComprobanteService comprobanteService,
                                 ComprobantesPendientesService comprobantesPendientesService) {
        this.comprobanteService = comprobanteService;
        this.comprobantesPendientesService = comprobantesPendientesService;
    }

    @GetMapping
    public ResponseEntity<List<ComprobanteDTO>> listar() {
        return ResponseEntity.ok(comprobanteService.listar());
    }

    /**
     * Lo que se cobró pidiendo boleta o factura y todavía no se emitió, agrupado por
     * fecha de viaje. Cada quien ve lo de su sucursal; el ADMIN, todo.
     */
    @GetMapping("/pendientes")
    public ResponseEntity<Map<String, Object>> pendientes(Authentication auth) {
        return ResponseEntity.ok(comprobantesPendientesService.pendientes(
                auth != null ? auth.getName() : null));
    }

    @GetMapping("/venta/{ventaId}")
    public ResponseEntity<List<ComprobanteDTO>> porVenta(@PathVariable String ventaId) {
        return ResponseEntity.ok(comprobanteService.listarPorVenta(ventaId));
    }

    @GetMapping("/{id}/nubefact")
    public ResponseEntity<Map<String, Object>> jsonNubefact(@PathVariable String id) {
        return ResponseEntity.ok(comprobanteService.jsonNubefact(id));
    }

    @PostMapping
    public ResponseEntity<ComprobanteDTO> generar(@RequestBody ComprobanteRequest req,
                                                  Authentication auth) {
        return ResponseEntity.ok(comprobanteService.generar(req, auth.getName()));
    }

    @PatchMapping("/{id}/anular")
    public ResponseEntity<ComprobanteDTO> anular(@PathVariable String id,
                                                 @RequestBody AnularComprobanteRequest req) {
        return ResponseEntity.ok(comprobanteService.anular(id, req.getMotivo()));
    }

    @PostMapping("/{id}/nota-credito")
    public ResponseEntity<ComprobanteDTO> notaCredito(@PathVariable String id,
                                                      @RequestBody AnularComprobanteRequest req,
                                                      Authentication auth) {
        return ResponseEntity.ok(comprobanteService.emitirNotaCredito(id, req.getMotivo(), auth.getName()));
    }
}
