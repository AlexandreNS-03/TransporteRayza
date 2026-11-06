package com.example.demo.service;

import com.example.demo.model.MovimientoCaja;
import com.example.demo.model.Venta;
import com.example.demo.repository.VentaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Devolver una venta que cobró Izipay.
 *
 * <p>Hasta ahora, apretar "Devolver" en una venta web hacía dos cosas mal al
 * mismo tiempo: anotaba un egreso en una caja por plata que nunca estuvo en ese
 * cajón, y no devolvía nada — alguien tenía que entrar al Back Office de Izipay
 * a mano, y si se olvidaba, el pasaje figuraba devuelto y el cliente seguía sin
 * su plata.
 *
 * <p>Lo que estas pruebas cuidan es la plata: que se le pida la devolución a
 * quien efectivamente cobró, por el monto de ESE pasaje, y que cuando Izipay no
 * pueda, quede escrito que falta hacerlo a mano en vez de darlo por hecho.
 */
class DevolucionPorIzipayTest {

    /** Un uuid de Izipay son 32 caracteres; con otra cosa ni se intenta. */
    private static final String UUID_TX = "a1b2c3d4e5f60718293a4b5c6d7e8f90";

    private List<Venta> ventas;
    private List<String> egresosDeCaja;
    private List<String> auditoria;
    private List<String> llamadasAIzipay;
    private IzipayService.Devolucion respuestaDeIzipay;
    private CancelacionService cancelaciones;

    @BeforeEach
    void armar() {
        ventas = new ArrayList<>();
        egresosDeCaja = new ArrayList<>();
        auditoria = new ArrayList<>();
        llamadasAIzipay = new ArrayList<>();

        respuestaDeIzipay = new IzipayService.Devolucion();
        respuestaDeIzipay.hecha = true;
        respuestaDeIzipay.operacion = "CANCELLED";
        respuestaDeIzipay.referencia = "ffffffffffffffffffffffffffffffff";

        VentaRepository ventaRepo = mock(VentaRepository.class);
        when(ventaRepo.findById(anyString())).thenAnswer(i -> ventas.stream()
                .filter(v -> i.getArgument(0).equals(v.getId())).findFirst());
        when(ventaRepo.save(any(Venta.class))).thenAnswer(i -> i.getArgument(0));

        // Subclases a mano y no mock(): con este JDK, Mockito no puede
        // instrumentar estas clases. Ya pasó con IzipayService y AuditoriaService.
        CajaService caja = new CajaService(null, null, null, null) {
            @Override public void registrarMovimientoAutomatico(String usuario,
                    MovimientoCaja.TipoMovimiento tipo, BigDecimal monto,
                    String motivo, String metodoPago) {
                egresosDeCaja.add(tipo + " S/ " + monto + " [" + metodoPago + "]");
            }
        };

        AsientoService asientos = new AsientoService(null, null, null, null) {
            @Override public void liberarAsiento(String ventaId) { }
        };

        AuditoriaService auditor = new AuditoriaService(null, null) {
            @Override public void registrar(String a, String m, String r, String d) {
                auditoria.add(d);
            }
        };

        IzipayService izipay = new IzipayService() {
            @Override public Devolucion reembolsar(String uuid, int montoCents, String comentario) {
                llamadasAIzipay.add(uuid + " | " + montoCents + " céntimos");
                return respuestaDeIzipay;
            }
        };

        cancelaciones = new CancelacionService(null, ventaRepo, null,
                asientos, caja, auditor, new AlcanceSucursal(null), null, izipay);
    }

    /** Un pasaje por resolver, con quién lo cobró y con qué referencia. */
    private Venta pasaje(String id, String metodo, String procesador, String referencia,
                         String precio) {
        Venta v = new Venta();
        v.setId(id);
        v.setEstado(Venta.EstadoVenta.PAGADO);
        v.setResolucion(Venta.Resolucion.PENDIENTE);
        v.setPrecio(new BigDecimal(precio));
        v.setMetodoPago(metodo);
        v.setProcesador(procesador);
        v.setPasarelaReferencia(referencia);
        v.setCanal("WEB");
        v.setViajeCodigo("RR-E-20261215-0800-SUC");
        v.setPasajeroNombre("Teresa Vásquez");
        ventas.add(v);
        return v;
    }

    @Test
    @DisplayName("Lo que cobró Izipay lo devuelve Izipay, y no sale de la caja")
    void loDevuelveIzipay() {
        pasaje("v-1", "TARJETA", "IZIPAY", UUID_TX, "90.00");

        cancelaciones.devolver("v-1", "cajera");

        assertEquals(1, llamadasAIzipay.size(), "No le pidió la devolución a Izipay");
        assertTrue(egresosDeCaja.isEmpty(),
                "Salió plata de una caja que nunca cobró esto: " + egresosDeCaja);
    }

    @Test
    @DisplayName("Se devuelve el precio de ESTE pasaje, en céntimos")
    void elMontoEsDeEstePasaje() {
        // Una compra web puede haber sido de cuatro pasajes en un solo cobro.
        // Si se mandara el monto de la transacción, cancelar uno devolvería los
        // cuatro. Y Izipay cobra en céntimos: mandar 90 en vez de 9000 devuelve
        // noventa céntimos.
        pasaje("v-2", "TARJETA", "IZIPAY", UUID_TX, "90.00");

        cancelaciones.devolver("v-2", "cajera");

        assertEquals(UUID_TX + " | 9000 céntimos", llamadasAIzipay.get(0));
    }

    @Test
    @DisplayName("Los céntimos no se pierden en el redondeo")
    void montoConCentimos() {
        pasaje("v-3", "TARJETA", "IZIPAY", UUID_TX, "45.50");

        cancelaciones.devolver("v-3", "cajera");

        assertTrue(llamadasAIzipay.get(0).endsWith("| 4550 céntimos"),
                "Mandó " + llamadasAIzipay.get(0));
    }

    @Test
    @DisplayName("Si Izipay no puede, se devuelve como antes y queda escrito que falta hacerlo a mano")
    void siIzipayFallaNoSeDaPorHecho() {
        // Es el caso real: devolver UNO de cuatro pasajes el mismo día en que se
        // compraron. Antes del cierre del lote Izipay solo sabe anular la
        // transacción entera, así que la parcial se rechaza. Lo que no puede
        // pasar es que el pasaje quede "devuelto" y nadie se entere de que la
        // plata no salió.
        respuestaDeIzipay = new IzipayService.Devolucion();
        respuestaDeIzipay.hecha = false;
        respuestaDeIzipay.motivo = "transaction not found";

        pasaje("v-4", "TARJETA", "IZIPAY", UUID_TX, "90.00");
        cancelaciones.devolver("v-4", "cajera");

        assertEquals(1, egresosDeCaja.size(), "Se quedó sin registrar de ninguna de las dos formas");
        assertTrue(auditoria.stream().anyMatch(a -> a.contains("PENDIENTE DE HACER A MANO")),
                "La auditoría no avisa que falta devolverlo a mano: " + auditoria);
        assertTrue(auditoria.stream().anyMatch(a -> a.contains("transaction not found")),
                "No quedó escrito POR QUÉ falló: " + auditoria);
    }

    @Test
    @DisplayName("Lo cobrado en el mostrador no pasa por Izipay")
    void elEfectivoNoTocaLaPasarela() {
        Venta v = pasaje("v-5", "EFECTIVO", null, null, "90.00");
        v.setCanal("MOSTRADOR");

        cancelaciones.devolver("v-5", "cajera");

        assertTrue(llamadasAIzipay.isEmpty(), "Le pidió a Izipay devolver algo que cobró el mostrador");
        assertEquals(1, egresosDeCaja.size(), "La devolución en efectivo dejó de salir de la caja");
    }

    @Test
    @DisplayName("El Yape de Mercado Pago todavía se devuelve a mano, no por Izipay")
    void elYapeNoEsDeIzipay() {
        // Se mira el PROCESADOR, no el método: pedirle a Izipay que devuelva un
        // cobro de Mercado Pago es, en el mejor de los casos, un error.
        pasaje("v-6", "YAPE", "MERCADOPAGO", UUID_TX, "90.00");

        cancelaciones.devolver("v-6", "cajera");

        assertTrue(llamadasAIzipay.isEmpty(), "Le pidió a Izipay devolver un cobro de Mercado Pago");
        assertEquals(1, egresosDeCaja.size());
    }

    @Test
    @DisplayName("Una venta vieja, sin procesador guardado, no se devuelve a ciegas")
    void sinProcesadorNoSeAdivina() {
        // Antes del PR #175 no se guardaba quién cobró. Deducirlo del método
        // sería adivinar, y adivinar con plata de otro no se hace.
        pasaje("v-7", "TARJETA", null, UUID_TX, "90.00");

        cancelaciones.devolver("v-7", "cajera");

        assertTrue(llamadasAIzipay.isEmpty(), "Adivinó que una venta vieja la había cobrado Izipay");
        assertEquals(1, egresosDeCaja.size());
    }

    @Test
    @DisplayName("El pasaje queda anulado y por resolver=DEVUELTO en los dos caminos")
    void elPasajeSiempreQuedaResuelto() {
        Venta ok = pasaje("v-8", "TARJETA", "IZIPAY", UUID_TX, "90.00");
        cancelaciones.devolver("v-8", "cajera");
        assertEquals(Venta.EstadoVenta.ANULADO, ok.getEstado());
        assertEquals(Venta.Resolucion.DEVUELTO, ok.getResolucion());
        assertNotNull(ok.getAnuladaAt());

        respuestaDeIzipay = new IzipayService.Devolucion();
        respuestaDeIzipay.hecha = false;
        respuestaDeIzipay.motivo = "no se pudo";

        Venta falla = pasaje("v-9", "TARJETA", "IZIPAY", UUID_TX, "90.00");
        cancelaciones.devolver("v-9", "cajera");
        assertEquals(Venta.EstadoVenta.ANULADO, falla.getEstado());
        assertEquals(Venta.Resolucion.DEVUELTO, falla.getResolucion());
    }
}
