package com.example.demo.controller;

import com.example.demo.service.AuditoriaService;
import com.example.demo.service.MercadoPagoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Los avisos de Mercado Pago llegan en dos formatos según de dónde se configuren:
 * Webhooks manda JSON y el IPN manda los datos en la URL, muchas veces sin cuerpo.
 * Los dos tienen que entrar, porque el panel deja configurar cualquiera de los dos.
 *
 * Los dobles van escritos a mano en vez de con Mockito: en esta versión de Java,
 * Mockito no puede instrumentar clases concretas.
 */
class MercadoPagoWebhookControllerTest {

    /** Responde lo que un pago dice estar, y anota a quién se le preguntó. */
    private static class MercadoPagoFalso extends MercadoPagoService {
        final List<String> consultados = new ArrayList<>();
        Map<String, Object> respuesta;

        @Override
        public Map<String, Object> consultarPago(String pagoId) {
            consultados.add(pagoId);
            return respuesta;
        }
    }

    /** Guarda lo que se haya registrado, sin tocar la base de datos. */
    private static class AuditoriaFalsa extends AuditoriaService {
        final List<String> registros = new ArrayList<>();

        AuditoriaFalsa() { super(null, null); }

        @Override
        public void registrar(String accion, String modulo, String referenciaId, String descripcion) {
            registros.add(accion + "|" + modulo + "|" + referenciaId + "|" + descripcion);
        }
    }

    private MockMvc mvc;
    private MercadoPagoFalso mercadoPago;
    private AuditoriaFalsa auditoria;

    @BeforeEach
    void prepararControlador() {
        mercadoPago = new MercadoPagoFalso();
        auditoria = new AuditoriaFalsa();
        mvc = MockMvcBuilders.standaloneSetup(
                new MercadoPagoWebhookController(mercadoPago, auditoria)).build();
    }

    @Test
    @DisplayName("Acepta el aviso de Webhooks, que llega como JSON")
    void formatoWebhooks() throws Exception {
        mercadoPago.respuesta = Map.of("status", "approved");

        mvc.perform(post("/api/public/mercadopago")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"payment\",\"data\":{\"id\":\"123\"}}"))
                .andExpect(status().isOk());

        assertEquals(List.of("123"), mercadoPago.consultados);
    }

    @Test
    @DisplayName("Acepta el aviso del IPN, que llega en la URL y sin cuerpo")
    void formatoIpn() throws Exception {
        mercadoPago.respuesta = Map.of("status", "approved");

        // Sin cuerpo y sin Content-Type de JSON: así lo manda el IPN, y así lo manda
        // el botón "Probar" del panel de Mercado Pago.
        mvc.perform(post("/api/public/mercadopago")
                        .param("topic", "payment")
                        .param("id", "456"))
                .andExpect(status().isOk());

        assertEquals(List.of("456"), mercadoPago.consultados);
    }

    @Test
    @DisplayName("Un pago devuelto queda avisado en auditoría")
    void pagoDevueltoAvisa() throws Exception {
        mercadoPago.respuesta = Map.of("status", "refunded", "external_reference", "venta-42");

        mvc.perform(post("/api/public/mercadopago")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"payment\",\"data\":{\"id\":\"789\"}}"))
                .andExpect(status().isOk());

        assertEquals(1, auditoria.registros.size());
        String r = auditoria.registros.get(0);
        assertTrue(r.startsWith("PAGO_WEBHOOK|VENTAS|venta-42|"), r);
        assertTrue(r.contains("refunded"), r);
    }

    @Test
    @DisplayName("Un pago aprobado no ensucia la auditoría")
    void pagoAprobadoNoAvisa() throws Exception {
        mercadoPago.respuesta = Map.of("status", "approved");

        mvc.perform(post("/api/public/mercadopago")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"payment\",\"data\":{\"id\":\"111\"}}"))
                .andExpect(status().isOk());

        assertTrue(auditoria.registros.isEmpty());
    }

    @Test
    @DisplayName("No se fía del aviso: el estado se le pregunta a la API")
    void noSeFiaDelAviso() throws Exception {
        // El aviso dice que está devuelto, pero la API dice que está aprobado.
        mercadoPago.respuesta = Map.of("status", "approved");

        mvc.perform(post("/api/public/mercadopago")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"payment\",\"data\":{\"id\":\"222\"},\"status\":\"refunded\"}"))
                .andExpect(status().isOk());

        assertTrue(auditoria.registros.isEmpty(),
                "un aviso no puede marcar nada por su cuenta: " + auditoria.registros);
    }

    @Test
    @DisplayName("Un aviso roto responde 200 igual, para que no lo reintenten sin fin")
    void avisoRotoNoRompe() throws Exception {
        mvc.perform(post("/api/public/mercadopago")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("esto no es json"))
                .andExpect(status().isOk());

        mvc.perform(post("/api/public/mercadopago")).andExpect(status().isOk());

        assertTrue(mercadoPago.consultados.isEmpty());
        assertTrue(auditoria.registros.isEmpty());
    }
}
