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
 * La ruta Iquitos → Requena se aborda en dos momentos: el carro sale de Iquitos y
 * el bote se toma en Nauta, horas después. Por eso su embarque NO se mide contra
 * la hora de salida sino contra el reloj: de 12:00 a 14:00.
 */
class VentanasEmbarqueTest {

    private final LocalDate viernes = LocalDate.of(2026, 8, 28);
    private final LocalTime once    = LocalTime.of(11, 0);

    @Test
    @DisplayName("Ruta normal: el embarque abre 2 h antes y cierra 20 min después de salir")
    void rutaSinPreembarque() {
        LocalDateTime[] v = VentaService.ventanaEmbarque(viernes, once, false);

        assertEquals(LocalDateTime.of(viernes, LocalTime.of(9, 0)), v[0]);
        assertEquals(LocalDateTime.of(viernes, LocalTime.of(11, 20)), v[1]);
    }

    @Test
    @DisplayName("Iquitos → Requena: el bote en Nauta va de 12:00 a 14:00, no según la salida")
    void rutaConPreembarque() {
        LocalDateTime[] v = VentaService.ventanaEmbarque(viernes, once, true);

        assertEquals(LocalDateTime.of(viernes, LocalTime.of(12, 0)), v[0]);
        assertEquals(LocalDateTime.of(viernes, LocalTime.of(14, 0)), v[1]);
    }

    @Test
    @DisplayName("Cambiar la hora de salida no mueve el embarque en Nauta")
    void laHoraDeSalidaNoMueveElBote() {
        LocalDateTime[] temprano = VentaService.ventanaEmbarque(viernes, LocalTime.of(7, 30), true);
        LocalDateTime[] tarde    = VentaService.ventanaEmbarque(viernes, LocalTime.of(15, 45), true);

        // Es una ventana de reloj: el bote recibe de 12 a 2 salga cuando salga el carro.
        assertArrayEquals(temprano, tarde);
        assertEquals(LocalTime.of(12, 0), temprano[0].toLocalTime());
        assertEquals(LocalTime.of(14, 0), temprano[1].toLocalTime());
    }

    @Test
    @DisplayName("El pre-embarque al carro abre 1 hora antes de la salida")
    void preembarqueAbreUnaHoraAntes() {
        LocalDateTime[] v = VentaService.ventanaPreembarque(viernes, once);

        assertEquals(LocalDateTime.of(viernes, LocalTime.of(10, 0)), v[0]);
        assertEquals(LocalDateTime.of(viernes, LocalTime.of(11, 20)), v[1]);
    }

    @Test
    @DisplayName("El pre-embarque abre después que el embarque de una ruta normal")
    void elPreembarqueEsMasTardeQueElEmbarqueNormal() {
        LocalDateTime[] pre    = VentaService.ventanaPreembarque(viernes, once);
        LocalDateTime[] normal = VentaService.ventanaEmbarque(viernes, once, false);

        // 1 h antes contra 2 h antes: el carro se aborda más cerca de la salida.
        assertTrue(pre[0].isAfter(normal[0]),
                "el pre-embarque (" + pre[0] + ") debe abrir después que el embarque normal (" + normal[0] + ")");
    }

    @Test
    @DisplayName("El carro se aborda antes que el bote")
    void primeroElCarroDespuesElBote() {
        LocalDateTime[] carro = VentaService.ventanaPreembarque(viernes, once);
        LocalDateTime[] bote  = VentaService.ventanaEmbarque(viernes, once, true);

        assertTrue(carro[0].isBefore(bote[0]), "el pre-embarque debe abrir antes que el embarque");
        assertTrue(carro[1].isBefore(bote[1]), "el pre-embarque debe cerrar antes que el embarque");
    }
}
