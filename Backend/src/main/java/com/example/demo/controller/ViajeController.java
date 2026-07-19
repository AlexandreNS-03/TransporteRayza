package com.example.demo.controller;

import com.example.demo.dto.ViajeDTO;
import com.example.demo.dto.ViajeRequest;
import com.example.demo.service.ViajeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/viajes")
@CrossOrigin(origins = "${app.frontend.url}")
public class ViajeController {

    private final ViajeService viajeService;

    public ViajeController(ViajeService viajeService) {
        this.viajeService = viajeService;
    }

    @GetMapping
    public ResponseEntity<List<ViajeDTO>> listar() {
        return ResponseEntity.ok(viajeService.listarViajes());
    }

    @PostMapping
    public ResponseEntity<ViajeDTO> crear(@RequestBody ViajeRequest req) {
        return ResponseEntity.ok(viajeService.crearViaje(req));
    }

    @GetMapping("/filtrar")
    public ResponseEntity<List<ViajeDTO>> filtrarPorFechas(
            @RequestParam String fechaInicio,
            @RequestParam String fechaFin) {
        return ResponseEntity.ok(viajeService.filtrarPorFechas(fechaInicio, fechaFin));
    }

}