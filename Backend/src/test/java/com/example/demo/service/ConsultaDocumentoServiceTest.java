package com.example.demo.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

/**
 * Los mensajes de la consulta de DNI y RUC.
 *
 * Antes cualquier fallo —token vencido, servicio caído, documento inexistente—
 * salía como el mismo "no se pudo consultar" y sin dejar rastro en el log. El
 * trabajador no sabía si reintentar y nadie podía averiguar la causa.
 */
class ConsultaDocumentoServiceTest {

    private ConsultaDocumentoService servicio;
    private MockRestServiceServer apisperu;

    @BeforeEach
    void prepararConToken() {
        servicio = new ConsultaDocumentoService();
        ReflectionTestUtils.setField(servicio, "token", "token-de-prueba");
        RestTemplate rest = (RestTemplate) ReflectionTestUtils.getField(servicio, "restTemplate");
        apisperu = MockRestServiceServer.bindTo(rest).build();
    }

    private String mensajeAlConsultarDni(org.springframework.test.web.client.response.DefaultResponseCreator respuesta) {
        apisperu.expect(requestTo(org.hamcrest.Matchers.containsString("/dni/45678912")))
                .andRespond(respuesta);
        RuntimeException e = assertThrows(RuntimeException.class, () -> servicio.consultarDni("45678912"));
        apisperu.verify();
        return e.getMessage();
    }

    @Test
    @DisplayName("Sin token configurado lo dice, en vez de culpar al servicio")
    void sinToken() {
        ReflectionTestUtils.setField(servicio, "token", "");
        RuntimeException e = assertThrows(RuntimeException.class, () -> servicio.consultarDni("45678912"));
        assertTrue(e.getMessage().contains("no está configurada"), e.getMessage());
    }

    @Test
    @DisplayName("Token vencido: se distingue de una caída del servicio")
    void tokenVencido() {
        String m = mensajeAlConsultarDni(withStatus(HttpStatus.UNAUTHORIZED).body("{\"message\":\"token invalido\"}"));
        assertTrue(m.toLowerCase().contains("venció") || m.toLowerCase().contains("no es válida"), m);
        // El trabajador necesita poder seguir vendiendo mientras tanto.
        assertTrue(m.contains("a mano"), m);
    }

    @Test
    @DisplayName("Pasado el límite de consultas se avisa como tal")
    void limiteDeConsultas() {
        String m = mensajeAlConsultarDni(withStatus(HttpStatus.TOO_MANY_REQUESTS).body(""));
        assertTrue(m.contains("límite"), m);
    }

    @Test
    @DisplayName("apisperu responde 500 ante casi todo: se trata como servicio caído")
    void servicioCaido() {
        String m = mensajeAlConsultarDni(withServerError().body("Ocurrió un Error"));
        assertTrue(m.contains("no está respondiendo"), m);
        assertTrue(m.contains("a mano"), m);
    }

    @Test
    @DisplayName("Un DNI que no existe no se confunde con un problema del servicio")
    void dniInexistente() {
        String m = mensajeAlConsultarDni(withSuccess("{}", MediaType.APPLICATION_JSON));
        assertTrue(m.contains("No se encontraron datos"), m);
    }

    @Test
    @DisplayName("Con datos arma el nombre completo sin espacios de más")
    void dniEncontrado() {
        apisperu.expect(requestTo(org.hamcrest.Matchers.containsString("/dni/45678912")))
                .andRespond(withSuccess(
                        "{\"nombres\":\"JUAN CARLOS\",\"apellidoPaterno\":\"PEREZ\",\"apellidoMaterno\":\"\"}",
                        MediaType.APPLICATION_JSON));

        Map<String, Object> r = servicio.consultarDni("45678912");

        // Sin apellido materno no debe quedar un espacio colgando al final.
        assertEquals("JUAN CARLOS PEREZ", r.get("nombreCompleto"));
        assertEquals("DNI", r.get("tipo"));
        apisperu.verify();
    }

    @Test
    @DisplayName("El RUC valida largo antes de gastar una consulta")
    void rucMalFormado() {
        RuntimeException e = assertThrows(RuntimeException.class, () -> servicio.consultarRuc("123"));
        assertTrue(e.getMessage().contains("11 dígitos"), e.getMessage());
        apisperu.verify();   // no se llamó a la API
    }
}
