package com.example.demo.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Las reglas de la contraseña.
 *
 * Estas pruebas existen por un error que estuvo meses en producción: la regla
 * estaba copiada en tres archivos y los tres decían algo distinto. Crear un
 * usuario del personal no validaba NADA — se podía dar de alta un administrador
 * con la clave "1" —, cambiarla pedía seis caracteres, y el cliente ocho. Justo
 * al revés: las cuentas del personal son las que ven a todos los pasajeros, la
 * caja y el respaldo de la base.
 *
 * Lo que guardan estas pruebas no es tanto el largo como que la regla sea UNA.
 */
class ClavesTest {

    @Test
    @DisplayName("El mínimo es ocho caracteres, para cualquier cuenta")
    void exigeOcho() {
        assertThrows(RuntimeException.class, () -> Claves.validar("rayza1"));
        assertThrows(RuntimeException.class, () -> Claves.validar("1"));
        assertThrows(RuntimeException.class, () -> Claves.validar(null));
        assertDoesNotThrow(() -> Claves.validar("Requena2026"));
    }

    @Test
    @DisplayName("Rechaza las que alguien prueba primero")
    void rechazaLasObvias() {
        for (String obvia : new String[]{ "12345678", "password", "PASSWORD", "rayza123", "contrasena" })
            assertThrows(RuntimeException.class, () -> Claves.validar(obvia),
                    "tendría que rechazar " + obvia);
    }

    @Test
    @DisplayName("La contraseña no puede ser el propio nombre de usuario")
    void noPuedeSerElUsuario() {
        // Una cuenta "caja01" con la clave "caja01" no la rompe nadie: la adivina.
        RuntimeException e = assertThrows(RuntimeException.class,
                () -> Claves.validar("mostrador", "mostrador"));
        assertTrue(e.getMessage().toLowerCase().contains("nombre de usuario"));

        assertThrows(RuntimeException.class, () -> Claves.validar("Mostrador", "mostrador"),
                "cambiar una mayúscula no la hace distinta");

        assertDoesNotThrow(() -> Claves.validar("Requena2026", "mostrador"));
    }

    @Test
    @DisplayName("El personal y el cliente comparten la misma regla")
    void laReglaEsUna() {
        // Si alguien vuelve a copiarla y la afloja en un lado, esto se cae.
        assertEquals(Claves.MINIMO, ClienteService.MINIMO_CLAVE);
        assertThrows(RuntimeException.class, () -> ClienteService.validarClave("rayza1"));
    }
}
