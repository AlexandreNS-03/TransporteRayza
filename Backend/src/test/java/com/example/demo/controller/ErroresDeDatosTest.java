package com.example.demo.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Qué se le dice a la persona cuando la base rechaza un guardado.
 *
 * Todas estas fallas llegan como la misma excepción, y antes todas salían como
 * "El registro ya existe o acaba de ser tomado por otra venta". Con un anuncio
 * demasiado largo, ese mensaje mandaba a buscar un duplicado que no existía.
 */
class ErroresDeDatosTest {

    private final GlobalExceptionHandler manejador = new GlobalExceptionHandler();

    private String mensajeDe(Throwable causa) {
        ResponseEntity<Map<String, String>> r =
                manejador.manejarConflictoDatos(new DataIntegrityViolationException("fallo", causa));
        return r.getBody().get("message");
    }

    @Test
    @DisplayName("Un texto que no entra en su columna lo dice, no habla de duplicados")
    void textoDemasiadoLargo() {
        String m = mensajeDe(new RuntimeException(
                "Data too long for column 'mensaje' at row 1"));

        assertTrue(m.contains("más largo"), m);
        assertTrue(m.contains("Acórtalo"), m);
        assertFalse(m.contains("ya existe"), "no es un duplicado: " + m);
    }

    @Test
    @DisplayName("Lo reconoce aunque venga envuelto en varias capas")
    void causaAnidada() {
        // Hibernate envuelve el error de MySQL en dos o tres excepciones.
        Throwable raiz = new RuntimeException("Data too long for column 'mensaje' at row 1");
        Throwable medio = new RuntimeException("could not execute statement", raiz);

        assertTrue(mensajeDe(medio).contains("más largo"));
    }

    @Test
    @DisplayName("Un duplicado de verdad sigue diciendo lo de siempre")
    void duplicadoDeVerdad() {
        String m = mensajeDe(new RuntimeException(
                "Duplicate entry 'A-12' for key 'uq_venta_asiento'"));

        assertTrue(m.contains("ya existe"), m);
    }

    @Test
    @DisplayName("Una causa desconocida cae al mensaje general sin romperse")
    void causaDesconocida() {
        assertTrue(mensajeDe(new RuntimeException("algo raro")).contains("ya existe"));
        assertTrue(mensajeDe(null).contains("ya existe"));
    }
}
