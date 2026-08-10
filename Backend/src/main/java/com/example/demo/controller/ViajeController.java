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

    /**
     * Lista de viajes. Con `estado` se traen solo los que interesan, separados por
     * coma: `?estado=PROGRAMADO` o `?estado=PROGRAMADO,EN_CURSO`.
     *
     * Sin filtro devuelve el historial completo, que crece para siempre. Las
     * pantallas que solo necesitan elegir un viaje próximo deben filtrar acá y no
     * descargarse todo para tirar el 95%.
     */
    @GetMapping
    public ResponseEntity<List<ViajeDTO>> listar(@RequestParam(required = false) String estado) {
        return ResponseEntity.ok(viajeService.listarViajes(estado));
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