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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Dejar un pasaje cancelado como saldo a favor.
 *
 * <p>Este movimiento se escribía <strong>a mano</strong>, sin pasar por el
 * WalletService: sin referencia. Y la referencia es lo único que impide
 * acreditar el mismo monto dos veces, porque la columna es única pero acepta
 * vacíos y MySQL permite tantos vacíos como quieras.
 *
 * <p>No alcanza con que la venta esté en PENDIENTE. Dos pedidos a la vez pasan
 * los dos esa comprobación: se hace con una lectura corriente, y en REPEATABLE
 * READ las dos transacciones miran la misma foto. La defensa tiene que estar en
 * el movimiento. Ver lo que ya costó en WalletService.consumir.
 */
class SaldoAFavorTest {

    private static final String TERESA = "teresa@ejemplo.pe";

    private List<Venta> ventas;
    private List<SaldoMovimiento> abonos;
    private List<String> movimientosDeCaja;
    private CancelacionService cancelaciones;

    @BeforeEach
    void unPasajePorResolver() {
        ventas = new ArrayList<>();
        abonos = new ArrayList<>();
        movimientosDeCaja = new ArrayList<>();

        VentaRepository ventaRepo = mock(VentaRepository.class);
        when(ventaRepo.findById(anyString())).thenAnswer(i -> ventas.stream()
                .filter(v -> i.getArgument(0).equals(v.getId())).findFirst());
        when(ventaRepo.save(any(Venta.class))).thenAnswer(i -> i.getArgument(0));

        // Subclases a mano y no mock(): con este JDK, Mockito no puede instrumentar
        // estas clases.
        CajaService caja = new CajaService(null, null, null, null) {
            @Override public void registrarMovimientoAutomatico(String usuario,
                    MovimientoCaja.TipoMovimiento tipo, BigDecimal monto,
                    String motivo, String metodoPago) {
                movimientosDeCaja.add(tipo + " S/ " + monto);
            }
        };

        // El falso respeta la regla que importa: una referencia repetida no
        // acredita de nuevo. Es lo que hace la columna única en la base.
        WalletService wallet = new WalletService(null, null, null, null, null, null) {
            @Override public SaldoMovimiento abonar(String email, BigDecimal monto,
                    String referencia, String motivo, SaldoMovimiento.Tipo tipo,
                    WalletService.Detalle detalle) {
                if (referencia == null || referencia.isBlank())
                    throw new RuntimeException("Un abono sin referencia no se puede acreditar");
                for (SaldoMovimiento ya : abonos)
                    if (referencia.equals(ya.getReferencia())) return ya;

                SaldoMovimiento m = new SaldoMovimiento();
                m.setClienteEmail(email);
                m.setMonto(monto);
                m.setMotivo(motivo);
                m.setTipo(tipo);
                m.setReferencia(referencia);
                if (detalle != null) {
                    m.setClienteDocumento(detalle.documento());
                    m.setClienteNombre(detalle.nombre());
                    m.setVentaId(detalle.ventaId());
                    m.setUsuarioNombre(detalle.usuarioNombre());
                }
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

    private Venta pasaje(String id, String correo) {
        Venta v = new Venta();
        v.setId(id);
        v.setEstado(Venta.EstadoVenta.PAGADO);
        v.setResolucion(Venta.Resolucion.PENDIENTE);
        v.setPrecio(new BigDecimal("90.00"));
        v.setMetodoPago("EFECTIVO");
        v.setClienteEmail(correo);
        v.setViajeCodigo("RR-E-20261215-0800-SUC");
        v.setPasajeroNombre("Teresa Vásquez");
        v.setPasajeroDocumento("44556677");
        ventas.add(v);
        return v;
    }

    @Test
    @DisplayName("El saldo a favor lleva la referencia del pasaje")
    void llevaReferencia() {
        pasaje("v-1", TERESA);

        cancelaciones.dejarSaldoAFavor("v-1", "cajera");

        assertEquals(1, abonos.size());
        assertEquals("saldo-favor-venta:v-1", abonos.get(0).getReferencia(),
                "sin referencia, nada impide que el mismo monto se acredite dos veces");
        assertEquals(0, new BigDecimal("90.00").compareTo(abonos.get(0).getMonto()));
        assertEquals(SaldoMovimiento.Tipo.SALDO_FAVOR, abonos.get(0).getTipo());
    }

    @Test
    @DisplayName("Dos pedidos a la vez acreditan una sola vez")
    void noAcreditaDosVeces() {
        Venta v = pasaje("v-1", TERESA);

        cancelaciones.dejarSaldoAFavor("v-1", "cajera");

        // El segundo pedido entró antes de que el primero confirmara, así que
        // todavía ve la venta en PENDIENTE: es lo que pasa con dos clics al
        // mismo botón. Lo que lo frena es la referencia, no el estado.
        v.setResolucion(Venta.Resolucion.PENDIENTE);
        cancelaciones.dejarSaldoAFavor("v-1", "cajera");

        assertEquals(1, abonos.size(), "le acreditó el pasaje dos veces");
    }

    @Test
    @DisplayName("Queda de quién era el pasaje y quién lo resolvió")
    void guardaDeQuienEs() {
        pasaje("v-1", TERESA);

        cancelaciones.dejarSaldoAFavor("v-1", "cajera");

        SaldoMovimiento m = abonos.get(0);
        assertEquals("44556677", m.getClienteDocumento());
        assertEquals("Teresa Vásquez", m.getClienteNombre());
        assertEquals("v-1", m.getVentaId());
        assertEquals("cajera", m.getUsuarioNombre(),
                "sin esto, el historial del mostrador no dice por orden de quién se hizo");
    }

    @Test
    @DisplayName("Dejar saldo a favor no mueve la caja")
    void noTocaLaCaja() {
        pasaje("v-1", TERESA);

        cancelaciones.dejarSaldoAFavor("v-1", "cajera");

        assertTrue(movimientosDeCaja.isEmpty(),
                "el saldo a favor no es plata que salga de un cajón: " + movimientosDeCaja);
    }

    @Test
    @DisplayName("Sin correo no hay cuenta a la que abonar")
    void sinCorreoNoSeGuarda() {
        pasaje("v-2", null);

        assertThrows(RuntimeException.class, () -> cancelaciones.dejarSaldoAFavor("v-2", "cajera"));
        assertTrue(abonos.isEmpty());
    }

    @Test
    @DisplayName("Un pasaje ya resuelto no se vuelve a resolver")
    void yaResuelto() {
        Venta v = pasaje("v-3", TERESA);
        v.setResolucion(Venta.Resolucion.DEVUELTO);

        assertThrows(RuntimeException.class, () -> cancelaciones.dejarSaldoAFavor("v-3", "cajera"));
        assertTrue(abonos.isEmpty());
    }
}
