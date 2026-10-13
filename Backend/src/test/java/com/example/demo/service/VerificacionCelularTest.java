package com.example.demo.service;

import com.example.demo.model.Cliente;
import com.example.demo.model.VerificacionCelular;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.repository.VerificacionCelularRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Verificar el celular de la cuenta.
 *
 * Lo que más se prueba acá es el conteo de intentos, y no por gusto: un código
 * de seis dígitos tiene un millón de combinaciones y probar es gratis. Que
 * venza en diez minutos no alcanza — en diez minutos se prueban muchísimas.
 * Lo que lo protege es que a los cinco fallos muera.
 */
class VerificacionCelularTest {

    private ClienteRepository clientes;
    private VerificacionCelularRepository repo;
    private VerificacionCelularService servicio;
    private Cliente ana;
    private VerificacionCelular guardada;

    @BeforeEach
    void prepararUnaCuentaSinVerificar() {
        clientes = mock(ClienteRepository.class);
        repo = mock(VerificacionCelularRepository.class);

        ana = new Cliente();
        ana.setId("c-1");
        ana.setEmail("ana@ejemplo.pe");
        ana.setCodigoPaisTelefono("+51");
        ana.setTelefono("965123456");
        when(clientes.findByEmail("ana@ejemplo.pe")).thenReturn(Optional.of(ana));
        when(clientes.save(any(Cliente.class))).thenAnswer(i -> i.getArgument(0));

        guardada = null;
        when(repo.save(any(VerificacionCelular.class))).thenAnswer(i -> {
            guardada = i.getArgument(0);
            return guardada;
        });
        when(repo.findFirstByClienteIdAndUsadoAtIsNullOrderByCreatedAtDesc("c-1"))
                .thenAnswer(i -> Optional.ofNullable(guardada)
                        .filter(v -> v.getUsadoAt() == null));

        servicio = new VerificacionCelularService(clientes, repo);
        ReflectionTestUtils.setField(servicio, "smsDisponible", false);
        ReflectionTestUtils.setField(servicio, "whatsappDisponible", false);
        ReflectionTestUtils.setField(servicio, "simulado", true);
    }

    /* ── Lo que protege un código de seis dígitos ── */

    @Test
    @DisplayName("A los cinco intentos fallidos el código muere, aunque después acierte")
    void cuentaLosIntentos() {
        String codigo = enviarYLeerElCodigo();

        for (int i = 1; i <= 4; i++) {
            RuntimeException e = assertThrows(RuntimeException.class,
                    () -> servicio.confirmar("ana@ejemplo.pe", "000000"));
            assertTrue(e.getMessage().contains("intento"),
                    "tendría que ir avisando cuántos quedan, y dijo: " + e.getMessage());
        }

        RuntimeException quinto = assertThrows(RuntimeException.class,
                () -> servicio.confirmar("ana@ejemplo.pe", "000000"));
        assertTrue(quinto.getMessage().toLowerCase().contains("demasiados"));

        // Y ya no sirve ni con el código bueno: si no, probar sería gratis.
        assertThrows(RuntimeException.class, () -> servicio.confirmar("ana@ejemplo.pe", codigo));
        assertFalse(ana.tieneCelularVerificado());
    }

    @Test
    @DisplayName("Con el código correcto, el celular queda verificado")
    void verificaConElCodigoBueno() {
        String codigo = enviarYLeerElCodigo();
        servicio.confirmar("ana@ejemplo.pe", codigo);
        assertTrue(ana.tieneCelularVerificado());
        assertNotNull(guardada.getUsadoAt(), "el código tiene que quedar usado");
    }

    @Test
    @DisplayName("El mismo código no sirve dos veces")
    void noSirveDosVeces() {
        String codigo = enviarYLeerElCodigo();
        servicio.confirmar("ana@ejemplo.pe", codigo);
        assertThrows(RuntimeException.class, () -> servicio.confirmar("ana@ejemplo.pe", codigo));
    }

    @Test
    @DisplayName("Un código vencido no verifica nada")
    void noSirveVencido() {
        String codigo = enviarYLeerElCodigo();
        guardada.setExpiraAt(LocalDateTime.now().minusMinutes(1));
        assertThrows(RuntimeException.class, () -> servicio.confirmar("ana@ejemplo.pe", codigo));
        assertFalse(ana.tieneCelularVerificado());
    }

    @Test
    @DisplayName("Del código se guarda el hash, nunca el código")
    void guardaElHash() {
        String codigo = enviarYLeerElCodigo();
        assertNotEquals(codigo, guardada.getCodigoHash());
        assertEquals(64, guardada.getCodigoHash().length(), "SHA-256 en hexadecimal");
    }

    /* ── Si cambia el número ── */

    @Test
    @DisplayName("Si cambió de número, el código viejo ya no verifica")
    void noVerificaOtroNumero() {
        String codigo = enviarYLeerElCodigo();
        ana.setTelefono("965999888");

        RuntimeException e = assertThrows(RuntimeException.class,
                () -> servicio.confirmar("ana@ejemplo.pe", codigo));
        assertTrue(e.getMessage().toLowerCase().contains("cambiaste de número"));
        assertFalse(ana.tieneCelularVerificado());
    }

    /* ── No ofrecer lo que no se puede cumplir ── */

    @Test
    @DisplayName("Sin canal contratado, no se ofrece verificar")
    void noOfreceSinCanal() {
        ReflectionTestUtils.setField(servicio, "simulado", false);
        assertFalse(servicio.hayPorDondeMandar());

        RuntimeException e = assertThrows(RuntimeException.class,
                () -> servicio.enviarCodigo("ana@ejemplo.pe"));
        assertTrue(e.getMessage().toLowerCase().contains("todavía no podemos"),
                "mejor decir que no se puede que ofrecer un botón que no funciona");
    }

    @Test
    @DisplayName("Cuando haya WhatsApp se usa ese, que acá sale más barato que el SMS")
    void prefiereWhatsapp() {
        ReflectionTestUtils.setField(servicio, "smsDisponible", true);
        assertEquals(VerificacionCelular.Canal.SMS, servicio.canalElegido());
        ReflectionTestUtils.setField(servicio, "whatsappDisponible", true);
        assertEquals(VerificacionCelular.Canal.WHATSAPP, servicio.canalElegido());
    }

    @Test
    @DisplayName("No manda dos códigos seguidos")
    void noEsUnaMaquinaDeMandarCodigos() {
        when(repo.pedidoReciente(eq("c-1"), any(LocalDateTime.class))).thenReturn(true);
        RuntimeException e = assertThrows(RuntimeException.class,
                () -> servicio.enviarCodigo("ana@ejemplo.pe"));
        assertTrue(e.getMessage().contains("hace menos de"));
    }

    @Test
    @DisplayName("No manda código a quien no escribió su número")
    void pideElNumeroPrimero() {
        ana.setTelefono(null);
        RuntimeException e = assertThrows(RuntimeException.class,
                () -> servicio.enviarCodigo("ana@ejemplo.pe"));
        assertTrue(e.getMessage().toLowerCase().contains("escribe tu número"));
    }

    @Test
    @DisplayName("El número se muestra tapado: confirma cuál es sin repetirlo entero")
    void tapaElNumero() {
        assertEquals("+51 ··· ··· 456", VerificacionCelularService.tapar("+51965123456"));
    }

    /** Lee el código de la consola, que es donde lo deja el modo simulado. */
    private String enviarYLeerElCodigo() {
        PrintStream original = System.out;
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        System.setOut(new PrintStream(buffer));
        try {
            servicio.enviarCodigo("ana@ejemplo.pe");
        } finally {
            System.setOut(original);
        }
        String salida = buffer.toString();
        return salida.substring(salida.lastIndexOf(": ") + 2).trim();
    }
}
