package com.example.demo.service;

import com.example.demo.model.TokenRecuperacion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Recuperación de contraseña: lo que decide si un enlace sirve o no.
 *
 * Es el camino por el que se entra a una cuenta sin saber la contraseña, así que
 * las reglas de vencimiento y de un solo uso no pueden fallar.
 */
class RecuperacionTest {

    private TokenRecuperacion tokenCon(LocalDateTime expira, LocalDateTime usado) {
        TokenRecuperacion t = new TokenRecuperacion();
        t.setExpiraAt(expira);
        t.setUsadoAt(usado);
        return t;
    }

    @Test
    @DisplayName("Un enlace recién creado sirve")
    void enlaceNuevo() {
        assertTrue(tokenCon(LocalDateTime.now().plusMinutes(59), null).estaVigente());
    }

    @Test
    @DisplayName("Un enlace vencido ya no sirve")
    void enlaceVencido() {
        assertFalse(tokenCon(LocalDateTime.now().minusMinutes(1), null).estaVigente());
    }

    @Test
    @DisplayName("Un enlace ya usado no sirve una segunda vez")
    void enlaceUsado() {
        // Aunque no haya vencido: es de un solo uso.
        assertFalse(tokenCon(LocalDateTime.now().plusMinutes(30), LocalDateTime.now()).estaVigente());
    }

    @Test
    @DisplayName("Sin fecha de vencimiento no se da por válido")
    void sinVencimiento() {
        assertFalse(tokenCon(null, null).estaVigente());
    }

    @Test
    @DisplayName("El hash es estable y no deja ver el token")
    void hashDelToken() {
        String token = "un-token-de-prueba";
        String h = RecuperacionService.hashear(token);

        assertEquals(h, RecuperacionService.hashear(token), "el mismo token da el mismo hash");
        assertEquals(64, h.length(), "SHA-256 en hexadecimal son 64 caracteres");
        assertFalse(h.contains(token), "el hash no puede contener el token");
    }

    @Test
    @DisplayName("Dos tokens distintos no comparten hash")
    void hashesDistintos() {
        assertNotEquals(RecuperacionService.hashear("token-a"),
                        RecuperacionService.hashear("token-b"));
    }
}
