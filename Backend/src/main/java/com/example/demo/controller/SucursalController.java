package com.example.demo.controller;

import com.example.demo.dto.SucursalDTO;
import com.example.demo.dto.SucursalRequest;
import com.example.demo.service.SucursalService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sucursales")
@CrossOrigin(origins = "http://localhost:5173")
public class SucursalController {

    private final SucursalService sucursalService;

    public SucursalController(SucursalService sucursalService) {
        this.sucursalService = sucursalService;
    }

    @GetMapping
    public ResponseEntity<List<SucursalDTO>> listar() {
        return ResponseEntity.ok(sucursalService.listarTodas());
    }

    @GetMapping("/activas")
    public ResponseEntity<List<SucursalDTO>> activas() {
        return ResponseEntity.ok(sucursalService.listarActivas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SucursalDTO> obtener(@PathVariable String id) {
        return ResponseEntity.ok(sucursalService.obtener(id));
    }

    @PostMapping
    public ResponseEntity<SucursalDTO> crear(@RequestBody SucursalRequest req) {
        return ResponseEntity.ok(sucursalService.crear(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SucursalDTO> editar(@PathVariable String id,
                                              @RequestBody SucursalRequest req) {
        return ResponseEntity.ok(sucursalService.editar(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desactivar(@PathVariable String id) {
        sucursalService.desactivar(id);
        return ResponseEntity.noContent().build();
    }
}