package com.example.demo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

/**
 * Comprueba qué se le manda realmente a Mercado Pago al cobrar.
 *
 * Existe porque los rechazos por "no pasó los controles de seguridad" dependen de
 * datos que viajan en la petición: si uno se deja de enviar, nada falla ni sale en
 * los logs — simplemente empiezan a rechazarse más pagos, y eso no se nota hasta
 * que un cliente reclama.
 */
class MercadoPagoPeticionTest {

    private MercadoPagoService servicio;
    private String cuerpoCrudo;
    private MockRestServiceServer mercadoPago;
    private final ObjectMapper json = new ObjectMapper();

    @BeforeEach
    void prepararServicioActivo() {
        servicio = new MercadoPagoService();
        ReflectionTestUtils.setField(servicio, "enabled", true);
        ReflectionTestUtils.setField(servicio, "accessToken", "TEST-token-de-prueba");
        ReflectionTestUtils.setField(servicio, "publicKey", "TEST-clave-publica");
        ReflectionTestUtils.setField(servicio, "endpoint", "https://api.mercadopago.com");
        ReflectionTestUtils.setField(servicio, "urlNotificacion", "https://rayza.test/api/public/mercadopago");

        RestTemplate rest = (RestTemplate) ReflectionTestUtils.getField(servicio, "restTemplate");
        mercadoPago = MockRestServiceServer.bindTo(rest).build();
    }

    private JsonNode cobrarYCapturar() throws Exception {
        StringBuilder capturado = new StringBuilder();
        StringBuilder deviceId = new StringBuilder();

        mercadoPago.expect(requestTo("https://api.mercadopago.com/v1/payments"))
                .andExpect(method(org.springframework.http.HttpMethod.POST))
                .andExpect(req -> {
                    capturado.append(((org.springframework.mock.http.client.MockClientHttpRequest) req)
                            .getBodyAsString());
                    String d = req.getHeaders().getFirst("X-meli-session-id");
                    if (d != null) deviceId.append(d);
                })
                .andRespond(withSuccess("{\"id\":123,\"status\":\"approved\"}", MediaType.APPLICATION_JSON));

        MercadoPagoService.Pagador pagador = MercadoPagoService.Pagador.de(
                "cliente@correo.com", "JUAN PEREZ GARCIA", "DNI", "45678912", "987654321");

        MercadoPagoService.Resultado r = servicio.pagar(
                "tok-123", new BigDecimal("80.00"), "Pasaje Rayza Iquitos → Requena",
                pagador, "venta-1", "venta-1", "huella-del-navegador");

        mercadoPago.verify();
        assertTrue(r.pagado, "el pago debía quedar aprobado");
        assertEquals("123", r.referencia);
        assertEquals("huella-del-navegador", deviceId.toString(),
                "el device id debe viajar en la cabecera X-meli-session-id");

        cuerpoCrudo = capturado.toString();
        return json.readTree(cuerpoCrudo);
    }

    @Test
    @DisplayName("Manda los datos del comprador que Mercado Pago usa para aprobar")
    void datosDelComprador() throws Exception {
        JsonNode pagador = cobrarYCapturar().path("payer");

        assertEquals("cliente@correo.com", pagador.path("email").asText());
        assertEquals("JUAN", pagador.path("first_name").asText());
        assertEquals("PEREZ GARCIA", pagador.path("last_name").asText());
        assertEquals("DNI", pagador.path("identification").path("type").asText());
        assertEquals("45678912", pagador.path("identification").path("number").asText());
        assertEquals("51", pagador.path("phone").path("area_code").asText());
        assertEquals("987654321", pagador.path("phone").path("number").asText());
    }

    @Test
    @DisplayName("Manda la referencia de la venta para poder conciliar después")
    void datosDeConciliacion() throws Exception {
        JsonNode cuerpo = cobrarYCapturar();

        assertEquals("venta-1", cuerpo.path("external_reference").asText());
        assertEquals("https://rayza.test/api/public/mercadopago", cuerpo.path("notification_url").asText());
        assertEquals("TRANSPORTES RAYZA", cuerpo.path("statement_descriptor").asText());
        // El descriptor sale en el resumen del cliente y Mercado Pago lo corta en 22.
        assertTrue(cuerpo.path("statement_descriptor").asText().length() <= 22);
    }

    @Test
    @DisplayName("Describe la compra en additional_info")
    void detalleDeLaCompra() throws Exception {
        JsonNode item = cobrarYCapturar().path("additional_info").path("items").get(0);

        assertEquals("Pasaje Rayza Iquitos → Requena", item.path("description").asText());
        assertEquals(1, item.path("quantity").asInt());
        assertEquals(0, new BigDecimal("80.00").compareTo(item.path("unit_price").decimalValue()));
    }

    @Test
    @DisplayName("El monto sigue saliendo como número, no como texto")
    void montoNumerico() throws Exception {
        JsonNode monto = cobrarYCapturar().path("transaction_amount");
        assertTrue(monto.isNumber(), "transaction_amount debe ir como número");
        assertEquals(0, new BigDecimal("80.00").compareTo(monto.decimalValue()));
        // Se revisa el texto tal cual sale por la red: el error que veía el cliente era
        // "Invalid value for transaction_amount", y lo primero a descartar es que el
        // monto se serialice entre comillas o en notación científica.
        assertTrue(cuerpoCrudo.contains("\"transaction_amount\":80.00"),
                "el monto debe salir como 80.00 sin comillas: " + cuerpoCrudo);
    }

    /*
     * Yape acepta entre S/ 1.00 y S/ 2,000 (publicado por Mercado Pago). Fuera de ese
     * rango la API responde "Invalid value for transaction_amount", que no le dice
     * nada al pasajero. Se revisa antes para explicarle qué hacer.
     */

    @Test
    @DisplayName("Un monto sobre el tope de Yape no se intenta cobrar")
    void montoSobreElTope() {
        // Sin expectativas en el mock: si llamara a la API, verify() fallaría.
        MercadoPagoService.Resultado r = servicio.pagar(
                "tok", new BigDecimal("2500.00"), "Pasajes", null, "g-1", "g-1", "huella");

        assertFalse(r.pagado);
        assertTrue(r.motivo.contains("2,000"), r.motivo);
        mercadoPago.verify();
    }

    @Test
    @DisplayName("Un precio en cero se avisa en vez de mandarse a la pasarela")
    void montoEnCero() {
        MercadoPagoService.Resultado r = servicio.pagar(
                "tok", BigDecimal.ZERO, "Pasaje", null, "v-1", "v-1", "huella");

        assertFalse(r.pagado);
        assertTrue(r.motivo.toLowerCase().contains("precio"), r.motivo);
        mercadoPago.verify();
    }

    @Test
    @DisplayName("No hay mínimo propio: un monto bajo se manda a Yape y lo decide Mercado Pago")
    void sinMinimoPropio() {
        mercadoPago.expect(requestTo("https://api.mercadopago.com/v1/payments"))
                .andRespond(withSuccess("{\"id\":5,\"status\":\"approved\"}", MediaType.APPLICATION_JSON));

        // El código no bloquea por monto bajo; si Yape no lo acepta, responde la API.
        MercadoPagoService.Resultado r = servicio.pagar(
                "tok", new BigDecimal("1.00"), "Pasaje", null, "v-1", "v-1", "huella");

        assertTrue(r.pagado, "un monto bajo debe llegar a la pasarela, no bloquearse acá");
        mercadoPago.verify();
    }

    @Test
    @DisplayName("Sin datos del comprador no se mandan campos vacíos que la API rechace")
    void sinDatosNoMandaVacios() throws Exception {
        mercadoPago.expect(requestTo("https://api.mercadopago.com/v1/payments"))
                .andRespond(withSuccess("{\"id\":9,\"status\":\"approved\"}", MediaType.APPLICATION_JSON));

        StringBuilder cuerpo = new StringBuilder();
        RestTemplate rest = (RestTemplate) ReflectionTestUtils.getField(servicio, "restTemplate");
        MockRestServiceServer otro = MockRestServiceServer.bindTo(rest).build();
        otro.expect(requestTo("https://api.mercadopago.com/v1/payments"))
                .andExpect(req -> cuerpo.append(((org.springframework.mock.http.client.MockClientHttpRequest) req)
                        .getBodyAsString()))
                .andRespond(withSuccess("{\"id\":9,\"status\":\"approved\"}", MediaType.APPLICATION_JSON));

        servicio.pagar("tok", new BigDecimal("50.00"), "Encomienda",
                MercadoPagoService.Pagador.de(null, null, null, null, null), "enc-1", "ENC-9", null);

        JsonNode pagador = json.readTree(cuerpo.toString()).path("payer");
        assertTrue(pagador.isObject() && pagador.isEmpty(),
                "sin datos, payer va vacío en vez de con nulls: " + pagador);
    }
}
