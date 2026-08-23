package com.example.demo.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Las horas en que se puede embarcar. Son reglas de reloj que deciden si un
 * pasajero sube o se queda en tierra, y equivocarse en una hora no se nota hasta
 * que hay gente parada en el muelle.
 *
 * La ruta Iquitos → Requena se aborda en dos momentos: el carro sale de Iquitos
 * y el bote se toma en Nauta, dos horas después. El embarque se ancla en la
 * partida del BOTE, no en la del carro: son puertos y horas distintas.
 */
class VentanasEmbarqueTest {

    private final LocalDate viernes = LocalDate.of(2026, 8, 28);

    /** El viaje real: sale de Iquitos 11:00 y el bote parte de Nauta 13:00. */
    private final LocalTime salidaIquitos = LocalTime.of(11, 0);
    private final int minutosHastaNauta   = 120;

    @Test
    @DisplayName("Ruta normal: abre 2 h antes de la salida y cierra 20 min después")
    void rutaSinPreembarque() {
        LocalDateTime[] v = VentaService.ventanaEmbarque(viernes, salidaIquitos, null);

        assertEquals(LocalDateTime.of(viernes, LocalTime.of(9, 0)),  v[0]);
        assertEquals(LocalDateTime.of(viernes, LocalTime.of(11, 20)), v[1]);
    }

    @Test
    @DisplayName("Iquitos → Requena: si el bote parte de Nauta a la 1, el embarque abre 11")
    void embarqueDosHorasAntesDeQuePartaElBote() {
        LocalDateTime[] v = VentaService.ventanaEmbarque(viernes, salidaIquitos, minutosHastaNauta);

        // Bote parte de Nauta 13:00 → abre 11:00, cierra 13:20.
        assertEquals(LocalDateTime.of(viernes, LocalTime.of(11, 0)),  v[0]);
        assertEquals(LocalDateTime.of(viernes, LocalTime.of(13, 20)), v[1]);
    }

    @Test
    @DisplayName("El embarque se mide desde el bote, no desde la salida del carro")
    void seAnclaEnElBoteNoEnElCarro() {
        LocalDateTime[] conBote = VentaService.ventanaEmbarque(viernes, salidaIquitos, minutosHastaNauta);
        LocalDateTime[] sinBote = VentaService.ventanaEmbarque(viernes, salidaIquitos, null);

        // Anclar en la salida daría 09:00; anclado en el bote da 11:00.
        assertNotEquals(sinBote[0], conBote[0]);
        assertEquals(2, java.time.Duration.between(sinBote[0], conBote[0]).toHours(),
                "las dos horas de diferencia son el trayecto Iquitos → Nauta");
    }

    @Test
    @DisplayName("Si cambia la hora de salida, el embarque se mueve con ella")
    void seMueveConLaSalida() {
        LocalDateTime[] v = VentaService.ventanaEmbarque(viernes, LocalTime.of(9, 30), minutosHastaNauta);

        // Sale 09:30, bote parte 11:30 → embarque abre 09:30.
        assertEquals(LocalDateTime.of(viernes, LocalTime.of(9, 30)), v[0]);
    }

    @Test
    @DisplayName("Sin paradas cargadas se cae a la hora de salida, como siempre")
    void sinParadasUsaLaSalida() {
        assertArrayEquals(
                VentaService.ventanaEmbarque(viernes, salidaIquitos, null),
                VentaService.ventanaEmbarque(viernes, salidaIquitos, null));

        LocalDateTime[] v = VentaService.ventanaEmbarque(viernes, salidaIquitos, null);
        assertEquals(LocalDateTime.of(viernes, LocalTime.of(9, 0)), v[0]);
    }

    @Test
    @DisplayName("El pre-embarque al carro abre 1 hora antes de la salida")
    void preembarqueAbreUnaHoraAntes() {
        LocalDateTime[] v = VentaService.ventanaPreembarque(viernes, salidaIquitos);

        assertEquals(LocalDateTime.of(viernes, LocalTime.of(10, 0)),  v[0]);
        assertEquals(LocalDateTime.of(viernes, LocalTime.of(11, 20)), v[1]);
    }

    @Test
    @DisplayName("Primero se aborda el carro y después el bote")
    void primeroElCarroDespuesElBote() {
        LocalDateTime[] carro = VentaService.ventanaPreembarque(viernes, salidaIquitos);
        LocalDateTime[] bote  = VentaService.ventanaEmbarque(viernes, salidaIquitos, minutosHastaNauta);

        assertTrue(carro[0].isBefore(bote[0]), "el pre-embarque debe abrir antes que el embarque");
        assertTrue(carro[1].isBefore(bote[1]), "el pre-embarque debe cerrar antes que el embarque");
    }
}
