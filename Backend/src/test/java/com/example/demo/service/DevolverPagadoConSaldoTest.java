package com.example.demo.service;

import com.example.demo.model.MovimientoCaja;
import com.example.demo.model.SaldoMovimiento;
import com.example.demo.model.Venta;
import com.example.demo.repository.VentaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Devolver un pasaje que se pagó con el saldo de la cuenta.
 *
 * <p>Es la grieta que abre encender la wallet. Antes todo lo que se devolvía
 * había entrado por la ventanilla o por una pasarela, así que devolver era
 * siempre sacar plata del cajón. El saldo no: esa plata entró el día que la
 * persona recargó, y a la caja de la oficina no llegó nunca.
 *
 * <p>Si se devuelve como las demás pasan dos cosas, y las dos son plata:
 * el cajón cierra corto por algo que ese mostrador no cobró, y la clienta se
 * queda sin su pasaje <em>y</em> sin su saldo.
 */
class DevolverPagadoConSaldoTest {

    private static final String TERESA = "teresa@ejemplo.pe";

    private List<Venta> ventas;
    private List<SaldoMovimiento> abonos;
    private List<String> egresosDeCaja;
    private CancelacionService cancelaciones;

    @BeforeEach
    void unPasajePagadoConSaldo() {
        ventas = new ArrayList<>();
        abonos = new ArrayList<>();
        egresosDeCaja = new ArrayList<>();

        VentaRepository ventaRepo = mock(VentaRepository.class);
        when(ventaRepo.findById(anyString())).thenAnswer(i -> ventas.stream()
                .filter(v -> i.getArgument(0).equals(v.getId())).findFirst());
        when(ventaRepo.save(any(Venta.class))).thenAnswer(i -> i.getArgument(0));

        // Subclases a mano y no mock(): con este JDK, Mockito no puede instrumentar
        // estas clases. Ya pasó antes con IzipayService y AuditoriaService.
        CajaService caja = new CajaService(null, null, null, null) {
            @Override public void registrarMovimientoAutomatico(String usuario,
                    MovimientoCaja.TipoMovimiento tipo, BigDecimal monto,
                    String motivo, String metodoPago) {
                egresosDeCaja.add(tipo + " S/ " + monto + " (" + motivo + ")");
            }
        };

        WalletService wallet = new WalletService(null, null, null, null, null) {
            @Override public SaldoMovimiento reintegrar(String email, BigDecimal monto,
                                                        String referencia, String motivo) {
                SaldoMovimiento m = new SaldoMovimiento();
                m.setClienteEmail(email);
                m.setMonto(monto);
                m.setReferencia(referencia);
                abonos.add(m);
                return m;
            }
        };

        AsientoService asientos = new AsientoService(null, null, null, null) {
            @Override public void liberarAsiento(String ventaId) { }
        };

        AuditoriaService auditoria = new AuditoriaService(null, null) {
            @Override public void registrar(String a, String m, String r, String d) { }
        };

        cancelaciones = new CancelacionService(null, ventaRepo, null,
                asientos, caja, auditoria, new AlcanceSucursal(null), wallet);
    }

    private Venta pasaje(String id, String metodoPago, String correo) {
        Venta v = new Venta();
        v.setId(id);
        v.setEstado(Venta.EstadoVenta.PAGADO);
        v.setResolucion(Venta.Resolucion.PENDIENTE);
        v.setPrecio(new BigDecimal("90.00"));
        v.setMetodoPago(metodoPago);
        v.setClienteEmail(correo);
        v.setViajeCodigo("RR-E-20261215-0800-SUC");
        v.setPasajeroNombre("Teresa Vásquez");
        ventas.add(v);
        return v;
    }

    @Test
    @DisplayName("Lo pagado con saldo vuelve al saldo, no al cajón")
    void vuelveAlSaldo() {
        pasaje("v-1", "SALDO", TERESA);

        cancelaciones.devolver("v-1", "cajera");

        assertEquals(1, abonos.size(), "No le devolvieron el saldo a la clienta");
        assertEquals(0, new BigDecimal("90.00").compareTo(abonos.get(0).getMonto()));
        assertEquals(TERESA, abonos.get(0).getClienteEmail());
        assertTrue(egresosDeCaja.isEmpty(),
                "Salió plata de la caja por algo que esa caja nunca cobró: " + egresosDeCaja);
    }

    @Test
    @DisplayName("La referencia es la de ESE pasaje, no la del cobro entero")
    void laReferenciaEsDeEsePasaje() {
        // Un cobro puede haber sido de cuatro pasajes en uno solo; si la
        // referencia fuera la del cobro, cancelar uno devolvería los cuatro.
        pasaje("v-1", "SALDO", TERESA);
        cancelaciones.devolver("v-1", "cajera");

        assertEquals("devolucion-venta:v-1", abonos.get(0).getReferencia());
    }

    @Test
    @DisplayName("Lo pagado en efectivo sigue saliendo de la caja")
    void loDemasNoCambia() {
        pasaje("v-2", "EFECTIVO", TERESA);

        cancelaciones.devolver("v-2", "cajera");

        assertTrue(abonos.isEmpty(), "Le abonó saldo a alguien que había pagado en efectivo");
        assertEquals(1, egresosDeCaja.size(), "La devolución en efectivo dejó de salir de la caja");
    }

    @Test
    @DisplayName("Sin correo no hay saldo al que devolver: se devuelve en efectivo")
    void sinCorreoSeDevuelveComoSiempre() {
        // No debería pasar —para pagar con saldo hace falta una cuenta— pero si
        // una fila vieja quedó sin correo, no devolver nada sería lo peor.
        pasaje("v-3", "SALDO", null);

        cancelaciones.devolver("v-3", "cajera");

        assertTrue(abonos.isEmpty());
        assertEquals(1, egresosDeCaja.size(), "Se quedó sin devolver de ninguna de las dos formas");
    }
}
