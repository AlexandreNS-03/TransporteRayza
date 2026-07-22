package com.example.demo.controller;

import com.example.demo.dto.PublicAsientoDTO;
import com.example.demo.dto.PublicRutaDTO;
import com.example.demo.dto.PublicViajeDTO;
import com.example.demo.service.PublicService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * API pública (sin autenticación) para la web del cliente: rutas, búsqueda de viajes
 * y mapa de asientos. Solo lectura.
 */
@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final PublicService publicService;

    public PublicController(PublicService publicService) {
        this.publicService = publicService;
    }

    /** Rutas activas con paradas y tramos (para los combos Desde/Hacia). */
    @GetMapping("/rutas")
    public ResponseEntity<List<PublicRutaDTO>> rutas() {
        return ResponseEntity.ok(publicService.listarRutas());
    }

    /** Ciudades/paradas disponibles (respaldo para autocompletar). */
    @GetMapping("/ubicaciones")
    public ResponseEntity<List<String>> ubicaciones() {
        return ResponseEntity.ok(publicService.listarUbicaciones());
    }

    /** Busca viajes disponibles. origen, destino y fecha son opcionales. */
    @GetMapping("/viajes")
    public ResponseEntity<List<PublicViajeDTO>> buscarViajes(
            @RequestParam(required = false) String origen,
            @RequestParam(required = false) String destino,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return ResponseEntity.ok(publicService.buscarViajes(origen, destino, fecha));
    }

    /** Mapa completo de asientos del viaje, marcando cuáles están libres en el tramo. */
    @GetMapping("/viajes/{viajeId}/asientos")
    public ResponseEntity<List<PublicAsientoDTO>> asientos(
            @PathVariable String viajeId,
            @RequestParam int ordenOrigen,
            @RequestParam int ordenDestino) {
        return ResponseEntity.ok(publicService.mapaAsientos(viajeId, ordenOrigen, ordenDestino));
    }
}
