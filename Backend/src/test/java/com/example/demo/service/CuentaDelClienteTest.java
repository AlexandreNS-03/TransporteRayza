package com.example.demo.service;

import com.example.demo.model.Cliente;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * La cuenta del cliente de la web.
 *
 * Todo lo que se prueba acá es de seguridad, y comparte una misma idea: quien
 * está del otro lado puede ser cualquiera. El registro y el login son públicos,
 * y hasta ahora el cliente no tenía ninguno de los frenos que sí tenía el panel.
 */
class CuentaDelClienteTest {

    private ClienteRepository repositorio;
    private CorreoEspia emailService;
    private ClienteService servicio;
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();

    private static final String CLAVE_BUENA = "rio-amazonas-26";

    @BeforeEach
    void prepararUnaCuenta() {
        repositorio = mock(ClienteRepository.class);
        // EmailService no se puede simular con Mockito (implementa
        // InitializingBean), así que se usa un doble escrito a mano.
        emailService = new CorreoEspia();
        // Ni JwtUtil ni AuditoriaService se dejan simular con Mockito en esta
        // versión de Java, así que van de verdad: el JWT con una llave de
        // juguete y la auditoría sin base detrás.
        JwtUtil jwt = new JwtUtil();
        ReflectionTestUtils.setField(jwt, "secret",
                "llave-de-prueba-que-no-se-usa-en-ningun-lado-32+");
        ReflectionTestUtils.setField(jwt, "expiration", 60_000L);

        servicio = new ClienteService(repositorio, null, null, null, encoder, jwt,
                new IntentosLoginService(IntentosEnMemoria.nuevo(), new AuditoriaMuda()), null, verificacionCelularSinCanal(), emailService);

        Cliente c = new Cliente();
        c.setId("c-1");
        c.setEmail("ana@ejemplo.pe");
        c.setNombres("Ana");
        c.setPassword(encoder.encode(CLAVE_BUENA));
        c.setActivo(true);
        when(repositorio.findByEmail("ana@ejemplo.pe")).thenReturn(Optional.of(c));
        when(repositorio.findByEmail("nadie@ejemplo.pe")).thenReturn(Optional.empty());
        when(repositorio.save(any(Cliente.class))).thenAnswer(i -> i.getArgument(0));
    }

    /* ── Probar contraseñas hasta acertar ── */

    @Test
    @DisplayName("Después de cinco intentos fallidos, la cuenta queda bloqueada un rato")
    void frenaAlQueVaProbando() {
        for (int i = 1; i <= 5; i++) {
            RuntimeException e = assertThrows(RuntimeException.class,
                    () -> servicio.login("ana@ejemplo.pe", "no-es", "1.2.3.4"));
            assertEquals("Correo o contraseña incorrectos", e.getMessage(),
                    "hasta el quinto intento, el error no debería cambiar");
        }

        RuntimeException bloqueo = assertThrows(RuntimeException.class,
                () -> servicio.login("ana@ejemplo.pe", "no-es", "1.2.3.4"));
        assertTrue(bloqueo.getMessage().toLowerCase().contains("minuto"),
                "el sexto intento tiene que avisar que está bloqueado, y dijo: " + bloqueo.getMessage());

        // Y queda bloqueado aunque ahora sí acierte: si no, bastaría con seguir.
        assertThrows(RuntimeException.class,
                () -> servicio.login("ana@ejemplo.pe", CLAVE_BUENA, "1.2.3.4"));
    }

    @Test
    @DisplayName("Cinco clientes distintos equivocándose no dejan sin comprar al sexto")
    void noCastigaALosQueCompartenAntena() {
        // En Loreto mucha gente entra por datos móviles y sale por la misma
        // dirección. Si la dirección se bloqueara a los cinco fallos como en el
        // panel, bastaría con que cinco clientes se equivocaran para dejar sin
        // comprar a todos los que estén detrás de esa antena.
        for (int i = 0; i < 5; i++) {
            final int n = i;
            assertThrows(RuntimeException.class,
                    () -> servicio.login("otra" + n + "@ejemplo.pe", "no-es", "9.9.9.9"));
        }
        assertDoesNotThrow(() -> servicio.login("ana@ejemplo.pe", CLAVE_BUENA, "9.9.9.9"),
                "el que sí sabe su contraseña tiene que poder entrar");
    }

    @Test
    @DisplayName("Pero la dirección sí se bloquea cuando el que prueba insiste de verdad")
    void frenaAlQueProbaMuchisimasCuentas() {
        for (int i = 0; i < 30; i++) {
            final int n = i;
            assertThrows(RuntimeException.class,
                    () -> servicio.login("masiva" + n + "@ejemplo.pe", "no-es", "6.6.6.6"));
        }
        RuntimeException e = assertThrows(RuntimeException.class,
                () -> servicio.login("ana@ejemplo.pe", CLAVE_BUENA, "6.6.6.6"));
        assertTrue(e.getMessage().toLowerCase().contains("minuto"),
                "treinta cuentas distintas desde una dirección ya no es alguien que se equivocó");
    }

    /* ── Averiguar quién tiene cuenta ── */

    @Test
    @DisplayName("Falle lo que falle, el mensaje es el mismo")
    void noDiceSiElCorreoExiste() {
        String claveMal = mensajeDe(() -> servicio.login("ana@ejemplo.pe", "no-es", "1.1.1.1"));
        String noExiste = mensajeDe(() -> servicio.login("nadie@ejemplo.pe", "lo-que-sea", "1.1.1.2"));

        Cliente apagada = new Cliente();
        apagada.setEmail("baja@ejemplo.pe");
        apagada.setPassword(encoder.encode(CLAVE_BUENA));
        apagada.setActivo(false);
        when(repositorio.findByEmail("baja@ejemplo.pe")).thenReturn(Optional.of(apagada));
        String desactivada = mensajeDe(() -> servicio.login("baja@ejemplo.pe", CLAVE_BUENA, "1.1.1.3"));

        assertEquals(claveMal, noExiste, "la respuesta no puede delatar que el correo no existe");
        assertEquals(claveMal, desactivada, "decir 'cuenta desactivada' ya confirma que existe");
    }

    @Test
    @DisplayName("Se comprueba una contraseña aunque el correo no exista, para que no delate el tiempo")
    void tardaLoMismoAunqueNoExista() {
        // bcrypt es lento a propósito. Si al no existir la cuenta se saltara esa
        // comprobación, responder tardaría órdenes de magnitud menos y eso solo
        // ya dice quién está registrado.
        long conCuenta = cuantoTarda(() -> servicio.login("ana@ejemplo.pe", "no-es", "7.0.0.1"));
        long sinCuenta = cuantoTarda(() -> servicio.login("nadie@ejemplo.pe", "no-es", "7.0.0.2"));

        assertTrue(sinCuenta > conCuenta / 4,
                "sin cuenta tardó " + sinCuenta + " µs y con cuenta " + conCuenta
                        + " µs: la diferencia revela quién está registrado");
    }

    /* ── Contraseñas débiles ── */

    @Test
    @DisplayName("No acepta contraseñas de menos de ocho caracteres")
    void exigeOchoCaracteres() {
        RuntimeException e = assertThrows(RuntimeException.class,
                () -> ClienteService.validarClave("rayza1"));
        assertTrue(e.getMessage().contains("8"));
        assertDoesNotThrow(() -> ClienteService.validarClave(CLAVE_BUENA));
    }

    @Test
    @DisplayName("Rechaza las que cualquiera probaría primero")
    void rechazaLasObvias() {
        for (String obvia : new String[]{"12345678", "password", "Contrasena", "RAYZA123"})
            assertThrows(RuntimeException.class, () -> ClienteService.validarClave(obvia),
                    "debería rechazar " + obvia);
    }

    /* ── Cambiar la contraseña desde adentro ── */

    @Test
    @DisplayName("Para cambiar la contraseña hay que saber la actual")
    void pideLaActual() {
        RuntimeException e = assertThrows(RuntimeException.class,
                () -> servicio.cambiarClave("ana@ejemplo.pe", "la-que-no-es", "otra-clave-larga"));
        assertTrue(e.getMessage().toLowerCase().contains("actual"));
    }

    @Test
    @DisplayName("Cambia la contraseña y avisa por correo")
    void cambiaYAvisa() {
        servicio.cambiarClave("ana@ejemplo.pe", CLAVE_BUENA, "otra-clave-larga-26");
        assertEquals("ana@ejemplo.pe", emailService.avisadoA,
                "un cambio de contraseña que el dueño no hizo tiene que avisarse en el momento");
    }

    @Test
    @DisplayName("La contraseña nueva no puede ser la misma de antes")
    void exigeQueSeaDistinta() {
        assertThrows(RuntimeException.class,
                () -> servicio.cambiarClave("ana@ejemplo.pe", CLAVE_BUENA, CLAVE_BUENA));
    }

    private String mensajeDe(Runnable r) {
        return assertThrows(RuntimeException.class, r::run).getMessage();
    }

    /** Auditoría que no escribe en ningún lado. */
    private static class AuditoriaMuda extends AuditoriaService {
        AuditoriaMuda() { super(null, null); }
        @Override
        public void registrar(String accion, String modulo, String referenciaId, String descripcion) { }
    }

    /** Doble de EmailService que solo anota a quién se le avisó. */
    private static class CorreoEspia extends EmailService {
        String avisadoA;
        CorreoEspia() { super(null); }
        @Override
        public void enviarAvisoClaveCambiada(String destinatario, String nombre) {
            this.avisadoA = destinatario;
        }
    }

    private long cuantoTarda(Runnable r) {
        long t0 = System.nanoTime();
        try { r.run(); } catch (RuntimeException ignorado) { }
        return (System.nanoTime() - t0) / 1000;
    }

    /** Un servicio de verificación de celular sin ningún canal: el perfil lo
     *  consulta para saber si puede ofrecer verificar, y sin él no se arma. */
    private static VerificacionCelularService verificacionCelularSinCanal() {
        // SmsService recién salido de fábrica: sin credenciales de Twilio, así que
        // estaActivo() es false y no hay canal por donde ofrecer nada.
        VerificacionCelularService v = new VerificacionCelularService(null, null, new SmsService());
        ReflectionTestUtils.setField(v, "whatsappDisponible", false);
        ReflectionTestUtils.setField(v, "simulado", false);
        return v;
    }
}
