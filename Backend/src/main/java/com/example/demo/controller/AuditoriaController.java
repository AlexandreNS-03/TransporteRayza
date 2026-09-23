package com.example.demo.controller;

import com.example.demo.model.Auditoria;
import com.example.demo.service.AuditoriaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auditoria")
@CrossOrigin(origins = "${app.frontend.url}")
public class AuditoriaController {

    private final AuditoriaService auditoriaService;

    public AuditoriaController(AuditoriaService auditoriaService) {
        this.auditoriaService = auditoriaService;
    }

    /**
     * Lo registrado, con filtros. Sin parámetros devuelve los últimos 500
     * movimientos, que es lo que la pantalla muestra al abrirse.
     */
    @GetMapping
    public ResponseEntity<List<Auditoria>> listar(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(required = false) String usuario,
            @RequestParam(required = false) String modulo,
            @RequestParam(required = false) String accion,
            @RequestParam(required = false) String q) {

        return ResponseEntity.ok(auditoriaService.buscar(
                fecha(desde), fecha(hasta), usuario, modulo, accion, q));
    }

    private static java.time.LocalDate fecha(String v) {
        try { return (v == null || v.isBlank()) ? null : java.time.LocalDate.parse(v); }
        catch (Exception e) { return null; }
    }
}
