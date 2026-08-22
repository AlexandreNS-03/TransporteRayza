package com.example.demo.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Los datos del comprador que se le mandan a Mercado Pago para que apruebe el
 * cobro. Si se arman mal, la API los rechaza o el motor antifraude los ignora,
 * y en los dos casos el pago se cae sin que se note por qué.
 */
class MercadoPagoServiceTest {

    private final MercadoPagoService servicio = new MercadoPagoService();

    @Test
    @DisplayName("Parte el nombre completo en nombre y apellidos")
    void partirNombre() {
        assertArrayEquals(new String[]{"JUAN", "PEREZ GARCIA"}, servicio.partirNombre("JUAN PEREZ GARCIA"));
        assertArrayEquals(new String[]{"MARIA", "LOPEZ"},       servicio.partirNombre("  MARIA   LOPEZ  "));
    }

    @Test
    @DisplayName("Con un solo nombre, el apellido queda vacío en vez de repetirse")
    void nombreSuelto() {
        assertArrayEquals(new String[]{"ANA", null}, servicio.partirNombre("ANA"));
    }

    @Test
    @DisplayName("Sin nombre no se inventa nada")
    void sinNombre() {
        assertArrayEquals(new String[]{null, null}, servicio.partirNombre(null));
        assertArrayEquals(new String[]{null, null}, servicio.partirNombre("   "));
    }

    @Test
    @DisplayName("Solo se mandan los tipos de documento que Mercado Pago Perú acepta")
    void tipoDeDocumento() {
        assertEquals("DNI", servicio.tipoDocumentoMp("DNI"));
        assertEquals("CE",  servicio.tipoDocumentoMp("ce"));
        assertEquals("RUC", servicio.tipoDocumentoMp("RUC"));
        // PASAPORTE no existe en su catálogo: se manda como DNI y no como algo inválido.
        assertEquals("DNI", servicio.tipoDocumentoMp("PASAPORTE"));
        assertEquals("DNI", servicio.tipoDocumentoMp(null));
    }

    @Test
    @DisplayName("El celular va sin el 51 y sin guiones ni espacios")
    void telefono() {
        Map<String, Object> t = servicio.telefonoMp("987 654-321");
        assertEquals("51", t.get("area_code"));
        assertEquals("987654321", t.get("number"));

        assertEquals("987654321", servicio.telefonoMp("+51 987654321").get("number"));
    }

    @Test
    @DisplayName("Un teléfono inservible no se manda")
    void telefonoInservible() {
        assertNull(servicio.telefonoMp(null));
        assertNull(servicio.telefonoMp("  "));
        assertNull(servicio.telefonoMp("123"));
    }
}
