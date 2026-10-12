package com.example.demo.service;

import com.example.demo.model.AutorizacionYape;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * El ciclo de una autorización de Yape On File.
 *
 * Lo que se prueba acá es la regla de negocio, no la pasarela: que no se pueda
 * cobrar sin permiso vigente, que revocar corte el cobro, y que un aviso
 * repetido del proveedor no rompa nada. Todo eso es nuestro y vale igual con
 * el proveedor de verdad.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class YapeOnFileTest {

    @Autowired private YapeOnFileService servicio;
    @Autowired private ReservaService reservaService;

    private static final String CLIENTE = "cliente@ejemplo.pe";

    private AutorizacionYape autorizado() {
        var inv = servicio.pedirAutorizacion(CLIENTE, "Cliente de prueba", "965123456");
        return servicio.confirmarAutorizacion(inv.autorizacionId(), "tok-123", "ref-abc");
    }

    @Test
    void sinAutorizacionNoSeCobra() {
        var r = servicio.cobrar("nadie@ejemplo.pe", new BigDecimal("80.00"), "Encomienda");
        assertFalse(r.pagado());
        assertTrue(r.motivo().contains("autorización"),
                "el motivo tiene que decir que falta la autorización, no un error técnico");
    }

    @Test
    void pedirlaNoAlcanzaParaCobrar() {
        servicio.pedirAutorizacion(CLIENTE, "Cliente de prueba", "965123456");

        var r = servicio.cobrar(CLIENTE, new BigDecimal("80.00"), "Encomienda");
        assertFalse(r.pagado(), "una autorización pendiente no habilita el cobro");
    }

    @Test
    void conAutorizacionVigenteSeCobra() {
        autorizado();

        var r = servicio.cobrar(CLIENTE, new BigDecimal("80.00"), "Encomienda ENC-000123");
        assertTrue(r.pagado());
        assertNotNull(r.referencia(), "un cobro tiene que dejar referencia para poder rastrearlo");
    }

    @Test
    void revocarCortaElCobro() {
        var a = autorizado();
        servicio.revocar(a.getId(), "El cliente la dio de baja");

        var r = servicio.cobrar(CLIENTE, new BigDecimal("80.00"), "Encomienda");
        assertFalse(r.pagado(), "después de revocar no se puede cobrar más");
    }

    @Test
    void elAvisoRepetidoDelProveedorNoRompe() {
        var inv = servicio.pedirAutorizacion(CLIENTE, "Cliente de prueba", "965123456");
        servicio.confirmarAutorizacion(inv.autorizacionId(), "tok-123", "ref-abc");
        var segunda = servicio.confirmarAutorizacion(inv.autorizacionId(), "tok-123", "ref-abc");

        assertEquals(AutorizacionYape.Estado.ACTIVA, segunda.getEstado(),
                "los webhooks se reintentan: que llegue dos veces no puede romper nada");
    }

    @Test
    void noSeCobraUnMontoInvalido() {
        autorizado();
        assertFalse(servicio.cobrar(CLIENTE, BigDecimal.ZERO, "x").pagado());
        assertFalse(servicio.cobrar(CLIENTE, new BigDecimal("-10"), "x").pagado());
    }

    /* ── Lo que ve el cliente en el paso de pago de la web ── */

    @SuppressWarnings("unchecked")
    private java.util.Map<String, Object> yapeGuardadoDe(String email) {
        return (java.util.Map<String, Object>) reservaService.metodosDePago(email).get("yapeGuardado");
    }

    @Test
    void sinSesionNoSeOfreceNingunYapeGuardado() {
        autorizado();   // existe una autorización, pero de OTRO cliente

        var opcion = yapeGuardadoDe(null);
        assertEquals(false, opcion.get("disponible"),
                "sin sesión no se puede ofrecer el medio de pago guardado de nadie");
        assertEquals(false, opcion.get("puedeGuardar"));
        assertNull(opcion.get("celularFinal"), "ni siquiera el celular parcial de otro");
    }

    @Test
    void aCadaClienteSeLeOfreceSoloElSuyo() {
        autorizado();   // autorización de CLIENTE

        assertEquals(true, yapeGuardadoDe(CLIENTE).get("disponible"));
        assertEquals(false, yapeGuardadoDe("otro@ejemplo.pe").get("disponible"),
                "la autorización de un cliente no puede aparecerle a otro");
    }

    @Test
    void alClienteSinAutorizacionSeLeOfreceGuardarla() {
        var opcion = yapeGuardadoDe("nuevo@ejemplo.pe");
        assertEquals(false, opcion.get("disponible"));
        assertEquals(true, opcion.get("puedeGuardar"),
                "con sesión y sin autorización, corresponde invitarlo a guardarla");
    }

    @Test
    void revocarQuitaLaOpcionDelPasoDePago() {
        var a = autorizado();
        assertEquals(true, yapeGuardadoDe(CLIENTE).get("disponible"));

        servicio.revocar(a.getId(), "El cliente la dio de baja");
        assertEquals(false, yapeGuardadoDe(CLIENTE).get("disponible"),
                "si la dio de baja, la opción no puede seguir apareciendo");
    }

    @Test
    void soloSeGuardanLosCuatroUltimosDigitosDelCelular() {
        var inv = servicio.pedirAutorizacion(CLIENTE, "Cliente de prueba", "965123456");
        var a = servicio.confirmarAutorizacion(inv.autorizacionId(), "tok-123", "ref-abc");

        assertEquals("3456", a.getCelularFinal(),
                "del celular solo se guarda el final, para que la persona reconozca su cuenta");
    }
}
