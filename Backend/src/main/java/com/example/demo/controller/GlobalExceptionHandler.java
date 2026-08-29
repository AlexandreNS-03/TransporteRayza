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
        // La causa se registra siempre: el mensaje que ve la persona es general a
        // propósito, y sin esto no había forma de saber qué restricción falló.
        System.err.println("[Datos] restricción violada: " + resumen(e));

        // Un texto que no entra en su columna no es un duplicado. Decir "el registro
        // ya existe" mandaba a buscar el problema al lado equivocado: pasó con un
        // anuncio largo, donde el aviso hablaba de otra venta que no existía.
        if (esTextoDemasiadoLargo(e))
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Uno de los textos es más largo de lo que admite el sistema. "
                             + "Acórtalo un poco e intenta de nuevo."));

        return ResponseEntity.badRequest().body(Map.of(
                "message", "El registro ya existe o acaba de ser tomado por otra venta. Actualiza e intenta de nuevo."));
    }

    private boolean esTextoDemasiadoLargo(Throwable e) {
        String texto = resumen(e).toLowerCase();
        return texto.contains("data too long") || texto.contains("value too long");
    }

    /** El mensaje de la causa raíz, que es donde la base explica qué pasó. */
    private String resumen(Throwable e) {
        Throwable raiz = e;
        while (raiz.getCause() != null && raiz.getCause() != raiz) raiz = raiz.getCause();
        String m = raiz.getMessage();
        return m == null ? e.toString() : m;
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> manejarErrorNegocio(RuntimeException e) {
        String mensaje = e.getMessage() != null ? e.getMessage() : "Error al procesar la solicitud";
        return ResponseEntity.badRequest().body(Map.of("message", mensaje));
    }
}
