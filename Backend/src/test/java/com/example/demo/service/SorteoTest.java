package com.example.demo.service;

import com.example.demo.model.CuponSorteo;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * El sorteo: que el VIP valga doble y que nadie quede fuera.
 *
 * Acá hay un premio de por medio, así que un sesgo no es un detalle estético: si
 * un cupón nunca pudiera salir, el sorteo sería mentira y habría que responder
 * por eso ante INDECOPI.
 */
class SorteoTest {

    private CuponSorteo cupon(String codigo, int peso) {
        CuponSorteo c = new CuponSorteo();
        c.setId(codigo);
        c.setCodigo(codigo);
        c.setPeso(peso);
        c.setPasajeroNombre("PRUEBA " + codigo);
        return c;
    }

    private SorteoService servicio() {
        return new SorteoService(null, null, null, null, null);
    }

    @Test
    @DisplayName("Con un solo cupón, ese gana")
    void unoSolo() {
        List<CuponSorteo> uno = List.of(cupon("A", 1));
        assertEquals("A", servicio().elegirPonderado(uno).getCodigo());
    }

    @Test
    @DisplayName("Todos los cupones pueden salir: ninguno queda fuera")
    void ningunoQuedaFuera() {
        List<CuponSorteo> cupones = List.of(cupon("A", 1), cupon("B", 1), cupon("C", 1));
        SorteoService s = servicio();

        java.util.Set<String> vistos = new java.util.HashSet<>();
        for (int i = 0; i < 3000; i++) vistos.add(s.elegirPonderado(cupones).getCodigo());

        assertEquals(3, vistos.size(), "en 3000 tiradas deberían haber salido los tres: " + vistos);
    }

    @Test
    @DisplayName("Un cupón VIP sale cerca del doble que uno normal")
    void elVipValeDoble() {
        // Un VIP (peso 2) contra un normal (peso 1): el VIP debería llevarse dos
        // tercios de las veces. Es lo que se le promete a quien paga el asiento caro.
        List<CuponSorteo> cupones = List.of(cupon("NORMAL", 1), cupon("VIP", 2));
        SorteoService s = servicio();

        Map<String, Integer> veces = new HashMap<>();
        int tiradas = 30_000;
        for (int i = 0; i < tiradas; i++)
            veces.merge(s.elegirPonderado(cupones).getCodigo(), 1, Integer::sum);

        double proporcionVip = veces.getOrDefault("VIP", 0) / (double) tiradas;
        assertTrue(proporcionVip > 0.63 && proporcionVip < 0.70,
                "el VIP debería ganar ~2/3 de las veces, salió " + proporcionVip);
    }

    @Test
    @DisplayName("Un peso ausente cuenta como 1, no rompe el sorteo")
    void pesoAusente() {
        CuponSorteo sinPeso = cupon("X", 1);
        sinPeso.setPeso(null);

        List<CuponSorteo> cupones = new ArrayList<>(List.of(sinPeso, cupon("Y", 1)));
        // Que un dato viejo esté en null no puede dejar a nadie fuera del sorteo.
        assertNotNull(servicio().elegirPonderado(cupones));
    }

    // ---- El nombre que se anuncia en público ----

    @Test
    @DisplayName("Se anuncia el nombre y la inicial, no el apellido completo")
    void nombreEnPublico() {
        assertEquals("JUAN P.", SorteoVivoService.nombreCorto("JUAN PEREZ GARCIA"));
        assertEquals("ANA", SorteoVivoService.nombreCorto("ANA"));
        assertEquals("Participante", SorteoVivoService.nombreCorto(null));
        assertEquals("Participante", SorteoVivoService.nombreCorto("   "));
    }
}
