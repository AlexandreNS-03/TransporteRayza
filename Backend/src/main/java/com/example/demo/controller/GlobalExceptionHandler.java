package com.example.demo.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * Convierte las RuntimeException de los servicios (errores de negocio:
 * "Venta no encontrada", "La venta ya está anulada", etc.) en respuestas
 * 400 con {"message": ...}. Sin esto, terminaban como 403 vacíos porque
 * el dispatch de error de Spring era bloqueado por Spring Security.
 * Los controladores con @ExceptionHandler propio (ej. AuthController) mantienen su comportamiento.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    // Violaciones de constraints de BD (p.ej. dos ventas simultáneas del mismo asiento/tramo)
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> manejarConflictoDatos(org.springframework.dao.DataIntegrityViolationException e) {
        return ResponseEntity.badRequest().body(Map.of(
                "message", "El registro ya existe o acaba de ser tomado por otra venta. Actualiza e intenta de nuevo."));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> manejarErrorNegocio(RuntimeException e) {
        String mensaje = e.getMessage() != null ? e.getMessage() : "Error al procesar la solicitud";
        return ResponseEntity.badRequest().body(Map.of("message", mensaje));
    }
}
