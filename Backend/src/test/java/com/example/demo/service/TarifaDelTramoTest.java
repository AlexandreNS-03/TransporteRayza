package com.example.demo.service;

import com.example.demo.model.RutaTarifaTramo;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * El precio de un tramo se empata por nombre de parada, no por número de orden.
 *
 * El caso real que lo motivó: a la ruta Iquitos→Requena se le agregó la parada
 * "Casa Grande" en medio, lo que corrió el número de todas las paradas siguientes.
 * Los viajes ya creados guardaron la numeración vieja (Requena en 12), pero la ruta
 * pasó a tener Requena en 13. Buscar la tarifa por número devolvía la del tramo de
 * al lado (Iquitos→Yanallapa, más barato) y la web cobraba de menos.
 */
class TarifaDelTramoTest {

    private RutaTarifaTramo tarifa(String origen, String destino, int oo, int od, String normal) {
        RutaTarifaTramo t = new RutaTarifaTramo();
        t.setOrigenTramo(origen);
        t.setDestinoTramo(destino);
        t.setOrdenOrigen(oo);
        t.setOrdenDestino(od);
        t.setPrecioNormal(new BigDecimal(normal));
        t.setPrecioVip(new BigDecimal(normal));
        return t;
    }

    /** Ruta actual: Requena quedó en orden 13 al insertarse "Casa Grande". */
    private List<RutaTarifaTramo> rutaConCasaGrande() {
        return List.of(
                tarifa("Iquitos", "Yanallapa", 1, 12, "100"),
                tarifa("Iquitos", "Requena",   1, 13, "120"));
    }

    @Test
    @DisplayName("Empata por nombre aunque el orden del viaje esté desfasado")
    void empataPorNombre() {
        // El viaje viejo pide Iquitos→Requena con orden 1→12 (numeración vieja).
        RutaTarifaTramo t = PublicService.tarifaDelTramo(
                rutaConCasaGrande(), "Iquitos", "Requena", 1, 12);

        assertNotNull(t);
        assertEquals(new BigDecimal("120"), t.getPrecioNormal(),
                "debe dar la tarifa Iquitos→Requena (120), no la de orden 1→12 (Yanallapa, 100)");
    }

    @Test
    @DisplayName("El nombre gana aunque el orden apunte a otra tarifa")
    void nombreLeGanaAlOrden() {
        // Orden 1→12 existe y es Yanallapa (100); pero pedimos Requena por nombre.
        RutaTarifaTramo t = PublicService.tarifaDelTramo(
                rutaConCasaGrande(), "iquitos", " requena ", 1, 12);
        assertEquals(new BigDecimal("120"), t.getPrecioNormal());
    }

    @Test
    @DisplayName("Sin nombre que empate, cae al respaldo por orden")
    void respaldoPorOrden() {
        RutaTarifaTramo t = PublicService.tarifaDelTramo(
                rutaConCasaGrande(), "Desconocido", "Otro", 1, 12);
        assertNotNull(t);
        assertEquals(new BigDecimal("100"), t.getPrecioNormal(), "orden 1→12 = Yanallapa");
    }

    @Test
    @DisplayName("Si la ruta no tiene la tarifa, devuelve null (el que llama usa el precio del viaje)")
    void sinTarifaDevuelveNull() {
        assertNull(PublicService.tarifaDelTramo(rutaConCasaGrande(), "Nauta", "Clavero", 2, 7));
        assertNull(PublicService.tarifaDelTramo(List.of(), "Iquitos", "Requena", 1, 13));
        assertNull(PublicService.tarifaDelTramo(null, "Iquitos", "Requena", 1, 13));
    }
}
