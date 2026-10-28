package com.example.demo.service;

import com.example.demo.model.Venta;
import com.example.demo.repository.VentaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Las categorías de pasajero frecuente.
 *
 * <p>Esto rebaja precios, así que lo que se prueba no es que calcule: es que no
 * le regale un descuento a quien no le toca y que no se le encime a una oferta
 * que ya estaba rebajando.
 */
class CategoriaPasajeroTest {

    private List<Venta> libro;
    private CategoriaPasajero categorias;

    @BeforeEach
    void prepararse() {
        libro = new ArrayList<>();

        VentaRepository ventas = mock(VentaRepository.class);
        when(ventas.contarViajesDe(anyString(), any(LocalDate.class))).thenAnswer(i -> {
            String doc = i.getArgument(0);
            LocalDate desde = i.getArgument(1);
            return libro.stream()
                    .filter(v -> doc.equals(v.getPasajeroDocumento()))
                    .filter(v -> v.getEstado() == Venta.EstadoVenta.PAGADO)
                    .filter(v -> !v.getFechaVenta().isBefore(desde))
                    .count();
        });

        categorias = new CategoriaPasajero(ventas);
        ReflectionTestUtils.setField(categorias, "habilitada", true);
        ReflectionTestUtils.setField(categorias, "meses", 12);
        ReflectionTestUtils.setField(categorias, "viajesPlata", 6);
        ReflectionTestUtils.setField(categorias, "descuentoPlata", 5);
        ReflectionTestUtils.setField(categorias, "viajesOro", 18);
        ReflectionTestUtils.setField(categorias, "descuentoOro", 10);
    }

    private void viajes(String documento, int cuantos, int haceMeses) {
        for (int i = 0; i < cuantos; i++) {
            Venta v = new Venta();
            v.setPasajeroDocumento(documento);
            v.setEstado(Venta.EstadoVenta.PAGADO);
            v.setFechaVenta(LocalDate.now().minusMonths(haceMeses));
            libro.add(v);
        }
    }

    @Test
    @DisplayName("Quien recién empieza no tiene descuento, y se le dice cuánto falta")
    void elQueEmpieza() {
        viajes("44556677", 2, 1);

        var e = categorias.de("44556677");

        assertEquals(CategoriaPasajero.Nivel.RAYZA, e.nivel());
        assertEquals(0, e.descuento());
        assertEquals(CategoriaPasajero.Nivel.PLATA, e.siguiente());
        assertEquals(4, e.viajesParaSiguiente());
    }

    @Test
    @DisplayName("A los 6 viajes es Plata; a los 18, Oro")
    void subeDeCategoria() {
        viajes("1", 6, 2);
        assertEquals(CategoriaPasajero.Nivel.PLATA, categorias.de("1").nivel());
        assertEquals(5, categorias.de("1").descuento());

        viajes("2", 18, 2);
        assertEquals(CategoriaPasajero.Nivel.ORO, categorias.de("2").nivel());
        assertEquals(10, categorias.de("2").descuento());
    }

    @Test
    @DisplayName("Los viajes viejos ya no cuentan")
    void laVentanaSeMueve() {
        // Dos años atrás viajó muchísimo, pero el programa premia al que viaja
        // ahora: si contaran para siempre, la categoría sería una herencia.
        viajes("3", 30, 24);

        assertEquals(CategoriaPasajero.Nivel.RAYZA, categorias.de("3").nivel());
        assertEquals(0, categorias.de("3").viajes());
    }

    @Test
    @DisplayName("Un pasaje anulado no cuenta como viaje")
    void elAnuladoNoCuenta() {
        viajes("4", 6, 1);
        libro.forEach(v -> v.setEstado(Venta.EstadoVenta.ANULADO));

        assertEquals(0, categorias.de("4").viajes());
        assertEquals(CategoriaPasajero.Nivel.RAYZA, categorias.de("4").nivel());
    }

    @Test
    @DisplayName("Sin documento no hay categoría")
    void sinDocumentoNoHayCategoria() {
        // Un invitado que compra sin cuenta no tiene cómo acumular, y pedirle la
        // categoría no puede reventar la compra.
        assertEquals(CategoriaPasajero.Nivel.RAYZA, categorias.de(null).nivel());
        assertEquals(CategoriaPasajero.Nivel.RAYZA, categorias.de("  ").nivel());
    }

    @Test
    @DisplayName("Apagado, nadie tiene descuento por más viajes que haya hecho")
    void apagadoNoRebajaNada() {
        ReflectionTestUtils.setField(categorias, "habilitada", false);
        viajes("5", 50, 1);

        assertEquals(0, categorias.de("5").descuento());
        assertEquals(0, new BigDecimal("90.00")
                .compareTo(categorias.conDescuento(new BigDecimal("90.00"), categorias.de("5"))));
    }

    @Test
    @DisplayName("El descuento redondea a favor del pasajero")
    void redondeaAFavorDelPasajero() {
        viajes("6", 18, 1);   // Oro, 10%

        // 90.33 - 9.03 = 81.30, no 81.297: el céntimo queda del lado de quien paga.
        assertEquals(0, new BigDecimal("81.30")
                .compareTo(categorias.conDescuento(new BigDecimal("90.33"), categorias.de("6"))));
        assertEquals(0, new BigDecimal("81.00")
                .compareTo(categorias.conDescuento(new BigDecimal("90.00"), categorias.de("6"))));
    }

    @Test
    @DisplayName("El precio nunca queda en negativo")
    void nuncaNegativo() {
        ReflectionTestUtils.setField(categorias, "descuentoOro", 150);
        viajes("7", 18, 1);

        assertEquals(0, BigDecimal.ZERO
                .compareTo(categorias.conDescuento(new BigDecimal("90.00"), categorias.de("7"))));
    }
}
