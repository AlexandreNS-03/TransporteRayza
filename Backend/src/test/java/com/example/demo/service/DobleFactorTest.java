package com.example.demo.service;

import com.example.demo.model.CodigoVerificacion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Segundo factor: qué hace válido a un código y qué no.
 *
 * Son 6 dígitos, o sea un millón de combinaciones: una máquina las prueba todas
 * en minutos. Lo que lo hace seguro no es el código en sí, sino que venza rápido
 * y que se muera a los pocos intentos.
 */
class DobleFactorTest {

    private CodigoVerificacion codigo(LocalDateTime expira, int intentos, LocalDateTime usado) {
        CodigoVerificacion c = new CodigoVerificacion();
        c.setExpiraAt(expira);
        c.setIntentos(intentos);
        c.setUsadoAt(usado);
        return c;
    }

    @Test
    @DisplayName("Un código recién enviado sirve")
    void codigoNuevo() {
        assertTrue(codigo(LocalDateTime.now().plusMinutes(9), 0, null).estaVigente());
    }

    @Test
    @DisplayName("Un código vencido no sirve")
    void codigoVencido() {
        assertFalse(codigo(LocalDateTime.now().minusSeconds(1), 0, null).estaVigente());
    }

    @Test
    @DisplayName("Un código ya usado no sirve dos veces")
    void codigoUsado() {
        assertFalse(codigo(LocalDateTime.now().plusMinutes(5), 0, LocalDateTime.now()).estaVigente());
    }

    @Test
    @DisplayName("A los 5 intentos el código muere, aunque no haya vencido")
    void demasiadosIntentos() {
        // Es lo que impide probar el millón de combinaciones.
        assertTrue(codigo(LocalDateTime.now().plusMinutes(5), 4, null).estaVigente(), "al 4to todavía vive");
        assertFalse(codigo(LocalDateTime.now().plusMinutes(5), 5, null).estaVigente(), "al 5to ya no");
        assertFalse(codigo(LocalDateTime.now().plusMinutes(5), 99, null).estaVigente());
    }

    // ---- La pista del correo ----
    //
    // Quien acertó la contraseña ya sabe de quién es la cuenta, pero el correo
    // completo es un dato más que regalar si esa contraseña estaba robada.

    @Test
    @DisplayName("El correo se muestra tapado, no completo")
    void correoTapado() {
        String tapado = AuthService.taparCorreo("rafael@gmail.com");

        assertFalse(tapado.contains("rafael"), "no debe verse el usuario completo: " + tapado);
        assertTrue(tapado.endsWith("@gmail.com"), "el dominio sí ayuda a saber dónde mirar");
    }

    @Test
    @DisplayName("Un correo muy corto tampoco se muestra entero")
    void correoCorto() {
        String tapado = AuthService.taparCorreo("ab@x.pe");
        assertTrue(tapado.contains("…"), tapado);
        assertTrue(tapado.endsWith("@x.pe"));
    }

    @Test
    @DisplayName("Sin correo no se rompe: se dice algo genérico")
    void sinCorreo() {
        assertEquals("tu correo", AuthService.taparCorreo(null));
        assertEquals("tu correo", AuthService.taparCorreo("esto-no-es-un-correo"));
    }
}
