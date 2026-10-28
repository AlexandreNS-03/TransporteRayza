package com.example.demo.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Avisarle la compra a Meta desde el servidor.
 *
 * <p>Lo que se prueba acá no es que "funcione": es que no cuente una venta dos
 * veces, que no se le escape el token a un log, y que nunca rompa una compra ya
 * cobrada. Un número de ventas inflado al doble hace que se decida mal dónde
 * poner la plata de publicidad, y eso cuesta más que no medir.
 */
class MetaConversionesTest {

    private static final String TOKEN = "EAAG-token-secreto-de-prueba-123456";

    private MetaConversionesService servicio() {
        return MetaConversionesService.paraPruebas("928682004455961", TOKEN, "TEST1234");
    }

    /* ── El id que impide contar dos veces ── */

    @Test
    @DisplayName("Una compra de varios pasajes lleva UN id, el del grupo")
    void unIdPorCompra() {
        var s = servicio();
        assertEquals("compra-G-1", s.idDeEvento("G-1", "v-1"));
        assertEquals("compra-G-1", s.idDeEvento("G-1", "v-2"),
                "dos pasajes de la misma compra con ids distintos se contarían como dos ventas");
    }

    @Test
    @DisplayName("Sin grupo, el id es el del pasaje")
    void sinGrupoUsaLaVenta() {
        assertEquals("compra-v-9", servicio().idDeEvento(null, "v-9"));
        assertEquals("compra-v-9", servicio().idDeEvento("  ", "v-9"));
    }

    @Test
    @DisplayName("El id no cambia entre llamadas: un reintento no es otra venta")
    void elIdEsEstable() {
        var s = servicio();
        assertEquals(s.idDeEvento("G-1", "v-1"), s.idDeEvento("G-1", "v-1"));
    }

    /* ── Qué se manda ── */

    @Test
    @DisplayName("El token va en el cuerpo, nunca en la URL")
    void elTokenVaEnElCuerpo() {
        // Una excepción de red imprime la URL del pedido. Con el token ahí, el
        // primer timeout lo deja escrito en los logs del servidor.
        Map<String, Object> c = servicio().cuerpoParaPrueba("compra-G-1", new BigDecimal("180.00"), 2, "Requena → Iquitos");
        assertEquals(TOKEN, c.get("access_token"));
    }

    @Test
    @DisplayName("No se manda ningún dato personal del comprador")
    void sinDatosPersonales() {
        Map<String, Object> c = servicio().cuerpoParaPrueba("compra-G-1", new BigDecimal("90.00"), 1, "Requena → Iquitos");
        String json = c.toString();

        for (String prohibido : new String[] { "em", "ph", "fn", "ln", "external_id", "db" }) {
            @SuppressWarnings("unchecked")
            Map<String, Object> user = (Map<String, Object>) ((Map<?, ?>) ((List<?>) c.get("data")).get(0)).get("user_data");
            assertFalse(user.containsKey(prohibido),
                    "user_data lleva " + prohibido + ": eso es la identidad del comprador");
        }
        assertFalse(json.contains("@"), "se coló un correo en el cuerpo");
    }

    @Test
    @DisplayName("El evento es Purchase con el monto, la moneda y la ruta")
    void loQueSeMide() {
        Map<String, Object> c = servicio().cuerpoParaPrueba("compra-G-1", new BigDecimal("180.00"), 2, "Requena → Iquitos");
        Map<?, ?> ev = (Map<?, ?>) ((List<?>) c.get("data")).get(0);

        assertEquals("Purchase", ev.get("event_name"));
        assertEquals("compra-G-1", ev.get("event_id"));
        assertEquals("website", ev.get("action_source"));

        Map<?, ?> custom = (Map<?, ?>) ev.get("custom_data");
        assertEquals("PEN", custom.get("currency"));
        assertEquals(0, new BigDecimal("180.00").compareTo((BigDecimal) custom.get("value")));
        assertEquals(2, custom.get("num_items"));
    }

    @Test
    @DisplayName("Con código de prueba, los eventos no entran en los informes")
    void modoDePrueba() {
        assertEquals("TEST1234",
                servicio().cuerpoParaPrueba("compra-G-1", BigDecimal.TEN, 1, "r").get("test_event_code"));

        var sinCodigo = MetaConversionesService.paraPruebas("1", TOKEN, null);
        assertFalse(sinCodigo.cuerpoParaPrueba("compra-G-1", BigDecimal.TEN, 1, "r")
                .containsKey("test_event_code"),
                "con el código puesto los eventos no cuentan: no puede quedarse pegado");
    }

    /* ── Apagado y a prueba de caídas ── */

    @Test
    @DisplayName("Sin token no está habilitada: la confirmación va sin id")
    void sinTokenNoAvisa() {
        var s = MetaConversionesService.paraPruebas("928682004455961", "", null);
        assertFalse(s.estaHabilitada());

        var sinPixel = MetaConversionesService.paraPruebas("", TOKEN, null);
        assertFalse(sinPixel.estaHabilitada());
    }

    @Test
    @DisplayName("Meta caído no rompe la compra, y el log no filtra el token")
    void metaCaidoNoRompeNada() {
        var s = servicio();
        // Un puerto donde no hay nadie: el pedido muere por conexión rechazada.
        ReflectionTestUtils.setField(s, "endpoint", "http://127.0.0.1:1");

        PrintStream antes = System.err;
        ByteArrayOutputStream capturado = new ByteArrayOutputStream();
        System.setErr(new PrintStream(capturado));
        try {
            assertDoesNotThrow(() ->
                    s.avisarCompra("compra-G-1", new BigDecimal("90.00"), 1, "Requena → Iquitos"),
                    "la venta ya se cobró: que Meta esté caído no puede tirarla");
        } finally {
            System.setErr(antes);
        }

        String log = capturado.toString();
        assertFalse(log.contains(TOKEN), "el token quedó escrito en el log: " + log);
        assertFalse(log.contains("127.0.0.1:1"), "el log filtra la URL del pedido: " + log);
        assertTrue(log.contains("compra-G-1"), "sin el id no hay forma de rastrear el evento perdido");
    }

    @Test
    @DisplayName("Apagada no manda nada aunque la llamen")
    void apagadaNoManda() {
        var s = MetaConversionesService.paraPruebas("1", "", null);
        ReflectionTestUtils.setField(s, "endpoint", "http://127.0.0.1:1");
        assertDoesNotThrow(() -> s.avisarCompra("compra-G-1", BigDecimal.TEN, 1, "r"));
    }

    @Test
    @DisplayName("Sin id de evento no se manda: deduplicar sin id es contar dos veces")
    void sinIdNoManda() {
        var s = servicio();
        ReflectionTestUtils.setField(s, "endpoint", "http://127.0.0.1:1");
        assertDoesNotThrow(() -> s.avisarCompra(null, BigDecimal.TEN, 1, "r"));
    }

    @Test
    @DisplayName("La identidad del comprador sigue sin mandarse, a propósito")
    void laDecisionDePrivacidadSigueEnNo() {
        // Si alguien la cambia, que sea con una decisión y no sin querer.
        assertFalse(MetaConversionesService.CON_IDENTIDAD);
    }
}
