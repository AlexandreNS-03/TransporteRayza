package com.example.demo.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Qué adjuntos se aceptan en una hoja de reclamación.
 *
 * El endpoint que registra la hoja es público —lo exige la norma—, así que
 * cualquiera puede mandar la URL que quiera. Sin este filtro, una hoja podría
 * terminar apuntando a un archivo de otro servidor: algo que mañana no existe,
 * o que no queremos enlazar desde el correo que le llega a la empresa.
 */
class AdjuntosReclamacionTest {

    private ReclamacionService servicio;

    @BeforeEach
    void prepararConNuestraCuenta() {
        servicio = new ReclamacionService(null, null);
        ReflectionTestUtils.setField(servicio, "cloudName", "dutcsc3jk");
    }

    @Test
    @DisplayName("Acepta un archivo de nuestra cuenta de Cloudinary")
    void aceptaElNuestro() {
        assertTrue(servicio.esDeNuestroCloudinary(
                "https://res.cloudinary.com/dutcsc3jk/image/upload/v1/reclamos/boleto.jpg"));
    }

    @Test
    @DisplayName("Rechaza la cuenta de otro, aunque el servidor sea Cloudinary")
    void rechazaOtraCuenta() {
        assertFalse(servicio.esDeNuestroCloudinary(
                "https://res.cloudinary.com/cuenta-ajena/image/upload/v1/algo.jpg"));
    }

    @Test
    @DisplayName("Un dominio que solo CONTIENE el nombre no pasa")
    void rechazaDominioParecido() {
        // El error clásico sería comparar con "contiene": este host lo contiene
        // y es otro servidor.
        assertFalse(servicio.esDeNuestroCloudinary(
                "https://res.cloudinary.com.atacante.pe/dutcsc3jk/image/upload/x.jpg"));
        assertFalse(servicio.esDeNuestroCloudinary(
                "https://malo.pe/?u=res.cloudinary.com/dutcsc3jk/"));
    }

    @Test
    @DisplayName("Sin https no se acepta")
    void exigeHttps() {
        assertFalse(servicio.esDeNuestroCloudinary(
                "http://res.cloudinary.com/dutcsc3jk/image/upload/v1/boleto.jpg"));
    }

    @Test
    @DisplayName("La cuenta que empieza igual pero es otra tampoco pasa")
    void rechazaPrefijoDeLaCuenta() {
        // "dutcsc3jk2" empieza con el nombre de nuestra cuenta; la barra lo corta.
        assertFalse(servicio.esDeNuestroCloudinary(
                "https://res.cloudinary.com/dutcsc3jk2/image/upload/v1/x.jpg"));
    }

    @Test
    @DisplayName("Basura o vacío no rompe, simplemente no pasa")
    void basuraNoRompe() {
        assertFalse(servicio.esDeNuestroCloudinary("no soy una url"));
        assertFalse(servicio.esDeNuestroCloudinary(""));
        assertFalse(servicio.esDeNuestroCloudinary("javascript:alert(1)"));
    }

    @Test
    @DisplayName("Sin cuenta configurada no se acepta ningún adjunto")
    void sinCuentaNoAceptaNada() {
        ReflectionTestUtils.setField(servicio, "cloudName", "");
        assertFalse(servicio.esDeNuestroCloudinary(
                "https://res.cloudinary.com/dutcsc3jk/image/upload/v1/boleto.jpg"));
    }
}
