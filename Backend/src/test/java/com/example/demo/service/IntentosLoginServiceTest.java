package com.example.demo.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * El freno a los intentos de adivinar contraseñas es de las pocas cosas del sistema
 * que solo se nota cuando falla, y para ese entonces ya entraron. Por eso va con
 * prueba propia.
 *
 * No necesita levantar la aplicación: la lógica es de conteo y tiempos.
 */
class IntentosLoginServiceTest {

    private IntentosLoginService servicio;

    @BeforeEach
    void preparar() {
        // La auditoría solo registra; acá basta una que no haga nada.
        servicio = new IntentosLoginService(new AuditoriaService(null, null) {
            @Override
            public void registrar(String accion, String modulo, String registroId, String detalle) { }
        });
    }

    @Test
    void dejaPasarMientrasNoSePaseDeLaCuenta() {
        for (int i = 0; i < 4; i++) {
            assertDoesNotThrow(() -> servicio.verificar("ana", "1.1.1.1"));
            servicio.registrarFallo("ana", "1.1.1.1");
        }
        // Cuatro fallos: quien se equivocó tecleando todavía puede seguir intentando.
        assertDoesNotThrow(() -> servicio.verificar("ana", "1.1.1.1"));
    }

    @Test
    void bloqueaAlQuintoFallo() {
        for (int i = 0; i < 5; i++) servicio.registrarFallo("ana", "1.1.1.1");

        RuntimeException e = assertThrows(RuntimeException.class,
                () -> servicio.verificar("ana", "1.1.1.1"));
        assertTrue(e.getMessage().contains("Demasiados intentos"), e.getMessage());
        assertTrue(e.getMessage().contains("minuto"), "debe decir cuánto falta: " + e.getMessage());
    }

    @Test
    void entrarBienBorraLoAcumulado() {
        for (int i = 0; i < 4; i++) servicio.registrarFallo("ana", "1.1.1.1");
        servicio.registrarExito("ana", "1.1.1.1");

        // Tras entrar bien vuelve a cero: el siguiente error no la deja fuera.
        servicio.registrarFallo("ana", "1.1.1.1");
        assertDoesNotThrow(() -> servicio.verificar("ana", "1.1.1.1"));
    }

    @Test
    void elBloqueoDeUnUsuarioNoAlcanzaALosDemas() {
        for (int i = 0; i < 5; i++) servicio.registrarFallo("ana", "1.1.1.1");

        // Otro usuario desde otra máquina sigue trabajando normal.
        assertDoesNotThrow(() -> servicio.verificar("luis", "2.2.2.2"));
    }

    @Test
    void bloqueaTambienPorDireccionAunqueCambieDeUsuario() {
        // El que prueba una contraseña contra muchos usuarios no acumula fallos en
        // ninguno, pero sí en su dirección.
        for (int i = 0; i < 5; i++) servicio.registrarFallo("usuario" + i, "9.9.9.9");

        assertThrows(RuntimeException.class, () -> servicio.verificar("otro", "9.9.9.9"));
    }
}
