package com.example.demo.controller;

import com.example.demo.service.ErroresWebService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Buzón de errores del navegador. Lo llama la web del cliente cuando una pantalla
 * revienta, para que el problema llegue a Soporte en vez de perderse.
 *
 * Va sin login porque la web pública no lo tiene. Siempre responde 200: si acá
 * fallara algo, lo último que queremos es un error dentro del reporte de errores.
 */
@RestController
@RequestMapping("/api/public/errores")
public class ErroresWebController {

    private final ErroresWebService erroresWebService;

    public ErroresWebController(ErroresWebService erroresWebService) {
        this.erroresWebService = erroresWebService;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> registrar(@RequestBody Map<String, String> datos,
                                                         HttpServletRequest http) {
        try {
            String origen = http.getHeader("Referer");
            return ResponseEntity.ok(Map.of("resultado", erroresWebService.registrar(datos, origen)));
        } catch (Exception e) {
            System.err.println("[ErrorWeb] No se pudo registrar: " + e.getMessage());
            return ResponseEntity.ok(Map.of("resultado", "Recibido"));
        }
    }
}
