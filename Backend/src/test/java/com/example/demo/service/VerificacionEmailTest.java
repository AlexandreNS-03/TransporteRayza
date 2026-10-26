package com.example.demo.service;

import com.example.demo.model.Cliente;
import com.example.demo.model.VerificacionEmail;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.repository.VerificacionEmailRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Confirmar que el correo de la cuenta es de quien dice.
 *
 * Hasta ahora cualquiera podía registrarse con el correo de otro: no le robaba
 * la cuenta, pero le llenaba la bandeja de boletos que no compró y dejaba al
 * dueño real sin poder registrarse con su propia dirección.
 */
class VerificacionEmailTest {

    private ClienteRepository clientes;
    private VerificacionEmailRepository tokens;
    private CorreoEspia correo;
    private VerificacionEmailService servicio;
    private Cliente ana;

    @BeforeEach
    void prepararUnaCuentaSinVerificar() {
        clientes = mock(ClienteRepository.class);
        tokens = mock(VerificacionEmailRepository.class);
        correo = new CorreoEspia();

        servicio = new VerificacionEmailService(clientes, tokens, correo);
        ReflectionTestUtils.setField(servicio, "urlWeb", "https://transporterayza.com");

        ana = new Cliente();
        ana.setId("c-1");
        ana.setEmail("ana@ejemplo.pe");
        ana.setNombres("Ana");
        when(clientes.findByEmail("ana@ejemplo.pe")).thenReturn(Optional.of(ana));
        when(clientes.findById("c-1")).thenReturn(Optional.of(ana));
        when(clientes.save(any(Cliente.class))).thenAnswer(i -> i.getArgument(0));
        when(tokens.save(any(VerificacionEmail.class))).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    @DisplayName("Manda el enlace y guarda el hash, nunca el token")
    void guardaElHashNoElToken() {
        servicio.enviarEnlace(ana);

        assertNotNull(correo.enlace, "tenía que salir el correo");
        String token = correo.enlace.substring(correo.enlace.indexOf("token=") + 6);
        assertFalse(token.isBlank());

        VerificacionEmail guardado = capturarGuardado();
        assertNotEquals(token, guardado.getTokenHash(),
                "si se guardara el token tal cual, filtrar la tabla sería filtrar los enlaces");
        assertEquals(64, guardado.getTokenHash().length(), "SHA-256 en hexadecimal");
    }

    @Test
    @DisplayName("Confirma el correo con el enlace y lo quema")
    void confirmaYQuema() {
        servicio.enviarEnlace(ana);
        VerificacionEmail guardado = capturarGuardado();
        when(tokens.findByTokenHash(guardado.getTokenHash())).thenReturn(Optional.of(guardado));

        String email = servicio.confirmar(tokenDelEnlace());

        assertEquals("ana@ejemplo.pe", email);
        assertTrue(ana.tieneCorreoVerificado());
        assertNotNull(guardado.getUsadoAt(), "el enlace tiene que quedar usado");
    }

    @Test
    @DisplayName("El mismo enlace no sirve dos veces")
    void noSirveDosVeces() {
        servicio.enviarEnlace(ana);
        VerificacionEmail guardado = capturarGuardado();
        when(tokens.findByTokenHash(guardado.getTokenHash())).thenReturn(Optional.of(guardado));

        servicio.confirmar(tokenDelEnlace());

        RuntimeException e = assertThrows(RuntimeException.class,
                () -> servicio.confirmar(tokenDelEnlace()));
        assertTrue(e.getMessage().contains("venció") || e.getMessage().contains("usó"));
    }

    @Test
    @DisplayName("Un enlace vencido no confirma nada")
    void noSirveVencido() {
        servicio.enviarEnlace(ana);
        VerificacionEmail guardado = capturarGuardado();
        guardado.setExpiraAt(LocalDateTime.now().minusMinutes(1));
        when(tokens.findByTokenHash(guardado.getTokenHash())).thenReturn(Optional.of(guardado));

        assertThrows(RuntimeException.class, () -> servicio.confirmar(tokenDelEnlace()));
        assertFalse(ana.tieneCorreoVerificado());
    }

    @Test
    @DisplayName("Si el cliente cambió de correo, el enlace viejo ya no confirma")
    void noConfirmaOtroCorreo() {
        servicio.enviarEnlace(ana);
        VerificacionEmail guardado = capturarGuardado();
        when(tokens.findByTokenHash(guardado.getTokenHash())).thenReturn(Optional.of(guardado));

        ana.setEmail("otra@ejemplo.pe");

        RuntimeException e = assertThrows(RuntimeException.class,
                () -> servicio.confirmar(tokenDelEnlace()));
        assertTrue(e.getMessage().toLowerCase().contains("otro correo"));
        assertFalse(ana.tieneCorreoVerificado());
    }

    @Test
    @DisplayName("Un token inventado no confirma nada")
    void noSirveInventado() {
        when(tokens.findByTokenHash(anyString())).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> servicio.confirmar("me-lo-invente"));
    }

    @Test
    @DisplayName("No manda dos correos seguidos al mismo cliente")
    void noEsUnaMaquinaDeSpam() {
        when(tokens.pedidoReciente(eq("c-1"), any(LocalDateTime.class))).thenReturn(true);
        servicio.enviarEnlace(ana);
        assertNull(correo.enlace, "ya se le había mandado uno hace menos de dos minutos");
    }

    @Test
    @DisplayName("No reenvía a quien ya está verificado")
    void noReenviaAlVerificado() {
        ana.setEmailVerificadoAt(LocalDateTime.now());
        RuntimeException e = assertThrows(RuntimeException.class,
                () -> servicio.reenviar("ana@ejemplo.pe"));
        assertTrue(e.getMessage().toLowerCase().contains("ya está verificado"));
    }

    private VerificacionEmail capturarGuardado() {
        org.mockito.ArgumentCaptor<VerificacionEmail> c =
                org.mockito.ArgumentCaptor.forClass(VerificacionEmail.class);
        verify(tokens, atLeastOnce()).save(c.capture());
        return c.getValue();
    }

    private String tokenDelEnlace() {
        return correo.enlace.substring(correo.enlace.indexOf("token=") + 6);
    }

    /** Doble de EmailService: anota el enlace en vez de mandarlo. */
    private static class CorreoEspia extends EmailService {
        String enlace;
        CorreoEspia() { super(null); }
        @Override
        public void enviarEnlaceVerificacion(String destinatario, String nombre,
                                             String enlace, int minutos) {
            this.enlace = enlace;
        }
    }
}
