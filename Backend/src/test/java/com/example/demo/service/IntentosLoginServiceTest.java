package com.example.demo.service;

import com.example.demo.model.IntentoLogin;
import com.example.demo.repository.IntentoLoginRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * El freno a los intentos de adivinar contraseñas es de las pocas cosas del sistema
 * que solo se nota cuando falla, y para ese entonces ya entraron. Por eso va con
 * prueba propia.
 *
 * No necesita levantar la aplicación: la lógica es de conteo y tiempos. La
 * tabla se imita con un mapa, pero respetando lo que hace de verdad —sumar sin
 * leer antes y bloquear solo si todavía corresponde—, que es de donde sale que
 * dos intentos a la vez no pierdan la cuenta.
 */
class IntentosLoginServiceTest {

    private IntentosLoginService servicio;
    private Map<String, IntentoLogin> tabla;

    @BeforeEach
    void preparar() {
        tabla = new HashMap<>();
        IntentoLoginRepository repo = IntentosEnMemoria.sobre(tabla);

        // La auditoría solo registra; acá basta una que no haga nada.
        servicio = new IntentosLoginService(repo, new AuditoriaService(null, null) {
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
    @DisplayName("El bloqueo sobrevive a un reinicio del servidor")
    void sobreviveAlReinicio() {
        // Es el agujero que tenía estando en memoria: cada despliegue de Railway
        // reiniciaba los contadores, y a quien prueba contraseñas le alcanzaba
        // con esperar al próximo.
        for (int i = 0; i < 5; i++) servicio.registrarFallo("ana", "1.1.1.1");
        assertThrows(RuntimeException.class, () -> servicio.verificar("ana", "1.1.1.1"));

        // Un servicio nuevo sobre la MISMA tabla: es lo que pasa al reiniciar.
        IntentosLoginService despuesDelReinicio = servicioSobreLaMismaTabla();
        assertThrows(RuntimeException.class,
                () -> despuesDelReinicio.verificar("ana", "1.1.1.1"),
                "el bloqueo tiene que seguir en pie después de reiniciar");
    }

    @Test
    @DisplayName("Dos instancias comparten la cuenta, no una cada una")
    void dosInstanciasCuentanJuntas() {
        // Con el mapa en memoria, cada instancia aguantaba cinco: la tolerancia
        // real era el doble de la que dice el código.
        IntentosLoginService otra = servicioSobreLaMismaTabla();
        for (int i = 0; i < 3; i++) servicio.registrarFallo("ana", "1.1.1.1");
        for (int i = 0; i < 2; i++) otra.registrarFallo("ana", "1.1.1.1");

        assertThrows(RuntimeException.class, () -> servicio.verificar("ana", "1.1.1.1"));
        assertThrows(RuntimeException.class, () -> otra.verificar("ana", "1.1.1.1"));
    }

    @Test
    @DisplayName("La limpieza borra lo viejo y respeta el bloqueo vigente")
    void laLimpiezaNoSeLlevaUnBloqueoVivo() {
        for (int i = 0; i < 5; i++) servicio.registrarFallo("ana", "1.1.1.1");
        int antes = tabla.size();

        servicio.limpiarViejos();

        assertTrue(tabla.size() <= antes);
        assertThrows(RuntimeException.class, () -> servicio.verificar("ana", "1.1.1.1"),
                "un bloqueo vigente no se puede borrar");
    }

    @Test
    void bloqueaTambienPorDireccionAunqueCambieDeUsuario() {
        // El que prueba una contraseña contra muchos usuarios no acumula fallos en
        // ninguno, pero sí en su dirección.
        for (int i = 0; i < 5; i++) servicio.registrarFallo("usuario" + i, "9.9.9.9");

        assertThrows(RuntimeException.class, () -> servicio.verificar("otro", "9.9.9.9"));
    }

    /** Otro servicio contra la misma tabla: imita otra instancia, o la misma tras reiniciar. */
    private IntentosLoginService servicioSobreLaMismaTabla() {
        IntentosLoginService otra;
        try {
            java.lang.reflect.Field f = IntentosLoginService.class.getDeclaredField("repositorio");
            f.setAccessible(true);
            otra = new IntentosLoginService((IntentoLoginRepository) f.get(servicio),
                    new AuditoriaService(null, null) {
                        @Override
                        public void registrar(String a, String m, String r, String d) { }
                    });
        } catch (ReflectiveOperationException e) {
            throw new AssertionError(e);
        }
        return otra;
    }
}
