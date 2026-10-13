package com.example.demo.service;

import com.example.demo.dto.PreferenciasNotificacionDTO;
import com.example.demo.model.Cliente;
import com.example.demo.model.PreferenciasNotificacion;
import com.example.demo.model.PreferenciasNotificacion.Canal;
import com.example.demo.model.PreferenciasNotificacion.Tipo;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.repository.PreferenciasNotificacionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Por dónde le escribimos a cada cliente, y para qué.
 *
 * Lo que se prueba acá es sobre todo la diferencia entre las dos cosas: lo
 * informativo es el servicio que la persona compró y lo promocional es
 * publicidad, que necesita permiso y hay que poder demostrarlo.
 */
class NotificacionesTest {

    private PreferenciasNotificacionRepository repo;
    private NotificacionesService servicio;
    private PreferenciasNotificacion guardada;

    @BeforeEach
    void prepararUnCliente() {
        repo = mock(PreferenciasNotificacionRepository.class);
        ClienteRepository clientes = mock(ClienteRepository.class);

        Cliente c = new Cliente();
        c.setId("c-1");
        c.setEmail("nelida@ejemplo.pe");
        when(clientes.findByEmail("nelida@ejemplo.pe")).thenReturn(Optional.of(c));
        when(clientes.findByEmail("nadie@ejemplo.pe")).thenReturn(Optional.empty());

        guardada = null;
        when(repo.save(any(PreferenciasNotificacion.class))).thenAnswer(i -> {
            guardada = i.getArgument(0);
            return guardada;
        });
        when(repo.findById("c-1")).thenAnswer(i -> Optional.ofNullable(guardada));

        servicio = new NotificacionesService(repo, clientes);
        ReflectionTestUtils.setField(servicio, "whatsappDisponible", false);
        ReflectionTestUtils.setField(servicio, "smsDisponible", false);
    }

    /* ── Lo informativo es el servicio, no una suscripción ── */

    @Test
    @DisplayName("El correo con el boleto y el comprobante no se puede apagar")
    void elCorreoDelServicioVaSiempre() {
        // Apagar esto sería venderle un pasaje que no puede mostrar al embarcar.
        servicio.guardar("nelida@ejemplo.pe", prefs(false, false, false, false, false));
        assertTrue(servicio.puedeRecibir("nelida@ejemplo.pe", Tipo.INFORMATIVO, Canal.EMAIL));
    }

    @Test
    @DisplayName("Quien no tiene cuenta igual recibe lo del servicio por correo, y nada más")
    void elInvitadoRecibeSuBoleto() {
        assertTrue(servicio.puedeRecibir("nadie@ejemplo.pe", Tipo.INFORMATIVO, Canal.EMAIL));
        assertFalse(servicio.puedeRecibir("nadie@ejemplo.pe", Tipo.PROMOCIONAL, Canal.EMAIL),
                "nadie le preguntó si quería publicidad");
    }

    /* ── Lo promocional necesita permiso, y hay que poder demostrarlo ── */

    @Test
    @DisplayName("La publicidad viene apagada: nadie le preguntó todavía")
    void laPublicidadVieneApagada() {
        PreferenciasNotificacionDTO p = servicio.deCliente("nelida@ejemplo.pe");
        assertFalse(p.isPromoEmail());
        assertFalse(p.isPromoWhatsapp());
        assertFalse(p.isPromoSms());
        assertNull(p.getPromoAceptadoAt());
    }

    @Test
    @DisplayName("Al encenderla queda anotado cuándo y desde dónde")
    void anotaElConsentimiento() {
        PreferenciasNotificacionDTO p = servicio.guardar("nelida@ejemplo.pe",
                prefs(false, false, true, false, false));

        assertTrue(p.isPromoEmail());
        assertNotNull(p.getPromoAceptadoAt(),
                "la Ley 29733 pide poder demostrar el permiso; un booleano suelto no demuestra nada");
        assertEquals("cuenta web", guardada.getPromoOrigen());
        assertNull(guardada.getPromoRevocadoAt());
    }

    @Test
    @DisplayName("Al apagarla toda queda anotado cuándo se dio de baja")
    void anotaLaBaja() {
        servicio.guardar("nelida@ejemplo.pe", prefs(false, false, true, false, false));
        servicio.guardar("nelida@ejemplo.pe", prefs(false, false, false, false, false));

        assertNotNull(guardada.getPromoRevocadoAt(), "tiene que quedar constancia de la baja");
        assertFalse(servicio.puedeRecibir("nelida@ejemplo.pe", Tipo.PROMOCIONAL, Canal.EMAIL));
    }

    @Test
    @DisplayName("Cambiar de canal sin apagar todo no cuenta como un permiso nuevo")
    void noRepiteElConsentimiento() {
        servicio.guardar("nelida@ejemplo.pe", prefs(false, false, true, false, false));
        String primero = guardada.getPromoAceptadoAt().toString();

        servicio.guardar("nelida@ejemplo.pe", prefs(false, false, true, true, false));

        assertEquals(primero, guardada.getPromoAceptadoAt().toString(),
                "el permiso es el mismo; solo cambió por dónde");
    }

    /* ── Un canal que no existe ── */

    @Test
    @DisplayName("Si WhatsApp no está integrado, no se manda aunque el cliente lo haya pedido")
    void noMandaPorUnCanalQueNoExiste() {
        servicio.guardar("nelida@ejemplo.pe", prefs(true, false, false, false, false));

        assertFalse(servicio.puedeRecibir("nelida@ejemplo.pe", Tipo.INFORMATIVO, Canal.WHATSAPP),
                "la preferencia se guarda, pero no hay por dónde mandarlo");

        // Y cuando se integre, la misma preferencia alcanza: no hay que volver
        // a preguntarle.
        ReflectionTestUtils.setField(servicio, "whatsappDisponible", true);
        assertTrue(servicio.puedeRecibir("nelida@ejemplo.pe", Tipo.INFORMATIVO, Canal.WHATSAPP));
    }

    @Test
    @DisplayName("La pantalla sabe que WhatsApp y SMS todavía no están")
    void laPantallaNoPrometeDeMas() {
        PreferenciasNotificacionDTO p = servicio.deCliente("nelida@ejemplo.pe");
        assertFalse(p.isWhatsappDisponible());
        assertFalse(p.isSmsDisponible());
    }

    private static PreferenciasNotificacionDTO prefs(boolean infoWa, boolean infoSms,
                                                     boolean promoEmail, boolean promoWa,
                                                     boolean promoSms) {
        PreferenciasNotificacionDTO d = new PreferenciasNotificacionDTO();
        d.setInfoWhatsapp(infoWa);
        d.setInfoSms(infoSms);
        d.setPromoEmail(promoEmail);
        d.setPromoWhatsapp(promoWa);
        d.setPromoSms(promoSms);
        return d;
    }
}
