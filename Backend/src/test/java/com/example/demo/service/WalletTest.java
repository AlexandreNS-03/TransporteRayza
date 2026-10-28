package com.example.demo.service;

import com.example.demo.dto.WalletDTO;
import com.example.demo.model.Cliente;
import com.example.demo.model.RecargaWallet;
import com.example.demo.model.SaldoMovimiento;
import com.example.demo.model.SaldoMovimiento.Tipo;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.repository.RecargaWalletRepository;
import com.example.demo.repository.SaldoMovimientoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * La Rayza Wallet.
 *
 * Esto es plata, así que lo que se prueba acá no es que "funcione": es que no se
 * pueda acreditar plata que nadie pagó, ni gastar dos veces la misma, ni quedar
 * con saldo negativo. Cada prueba de abajo corresponde a una forma concreta de
 * perder dinero.
 */
class WalletTest {

    private List<SaldoMovimiento> libro;
    private SaldoMovimientoRepository movimientos;
    private RecargaWalletRepository recargas;
    private List<RecargaWallet> recargasGuardadas;
    private IzipayFalso izipay;
    private MercadoPagoFalso mercadoPago;
    private WalletService wallet;

    private static final String ANA = "ana@ejemplo.pe";

    @BeforeEach
    void prepararUnaCuentaSinSaldo() {
        libro = new ArrayList<>();
        recargasGuardadas = new ArrayList<>();

        movimientos = mock(SaldoMovimientoRepository.class);
        recargas = mock(RecargaWalletRepository.class);
        izipay = new IzipayFalso();
        mercadoPago = new MercadoPagoFalso();
        ClienteRepository clientes = mock(ClienteRepository.class);
        AuditoriaService auditoria = new AuditoriaService(null, null) {
            @Override public void registrar(String a, String m, String r, String d) { }
        };

        Cliente ana = new Cliente();
        ana.setId("c-1");
        ana.setEmail(ANA);
        ana.setNombres("Ana");
        ana.setApellidos("Ruiz");
        ana.setNumeroDocumento("44556677");
        when(clientes.findByEmail(ANA)).thenReturn(Optional.of(ana));
        when(clientes.bloquearPorEmail(ANA)).thenReturn(Optional.of(ana));

        // El libro de movimientos, en memoria. La columna `referencia` es única en
        // la base; acá se imita rechazando la repetida.
        when(movimientos.save(any(SaldoMovimiento.class))).thenAnswer(i -> guardar(i.getArgument(0)));
        when(movimientos.saveAndFlush(any(SaldoMovimiento.class))).thenAnswer(i -> guardar(i.getArgument(0)));
        when(movimientos.findByReferencia(anyString())).thenAnswer(i -> libro.stream()
                .filter(m -> i.getArgument(0).equals(m.getReferencia())).findFirst());
        when(movimientos.saldoDe(anyString())).thenAnswer(i -> libro.stream()
                .filter(m -> ((String) i.getArgument(0)).equalsIgnoreCase(m.getClienteEmail()))
                .map(SaldoMovimiento::getMonto)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        when(movimientos.bloquearMovimientosDe(anyString())).thenAnswer(i -> libro.stream()
                .filter(m -> ((String) i.getArgument(0)).equalsIgnoreCase(m.getClienteEmail()))
                .toList());
        when(movimientos.findByClienteEmailIgnoreCaseOrderByCreatedAtDesc(anyString()))
                .thenAnswer(i -> libro.stream()
                        .filter(m -> ((String) i.getArgument(0)).equalsIgnoreCase(m.getClienteEmail()))
                        .sorted(Comparator.comparing(SaldoMovimiento::getCreatedAt).reversed())
                        .toList());

        when(recargas.saveAndFlush(any(RecargaWallet.class))).thenAnswer(i -> {
            recargasGuardadas.add(i.getArgument(0));
            return i.getArgument(0);
        });
        when(recargas.save(any(RecargaWallet.class))).thenAnswer(i -> i.getArgument(0));
        when(recargas.findById(anyString())).thenAnswer(i -> recargasGuardadas.stream()
                .filter(r -> i.getArgument(0).equals(r.getId())).findFirst());
        when(recargas.findByIdAndClienteEmailIgnoreCase(anyString(), anyString()))
                .thenAnswer(i -> recargasGuardadas.stream()
                        .filter(r -> i.getArgument(0).equals(r.getId())
                                && ((String) i.getArgument(1)).equalsIgnoreCase(r.getClienteEmail()))
                        .findFirst());

        wallet = new WalletService(movimientos, recargas, clientes, izipay, mercadoPago, auditoria);
        ReflectionTestUtils.setField(wallet, "habilitada", true);
    }

    private SaldoMovimiento guardar(SaldoMovimiento m) {
        if (m.getReferencia() != null && libro.stream()
                .anyMatch(x -> m.getReferencia().equals(x.getReferencia()) && !x.getId().equals(m.getId())))
            throw new org.springframework.dao.DataIntegrityViolationException("referencia repetida");
        libro.add(m);
        return m;
    }

    /* ── El saldo es la suma del libro, no un número guardado ── */

    @Test
    @DisplayName("El saldo es la suma de los movimientos, con su signo")
    void elSaldoEsLaSuma() {
        wallet.abonar(ANA, new BigDecimal("50.00"), "r-1", "recarga", Tipo.ABONO);
        wallet.abonar(ANA, new BigDecimal("30.00"), "r-2", "cancelación", Tipo.SALDO_FAVOR);
        wallet.consumir(ANA, new BigDecimal("20.00"), "v-1", "pasaje");

        assertEquals(0, new BigDecimal("60.00").compareTo(wallet.saldoDe(ANA)));

        // Y la lista que ve el cliente suma exactamente eso: si no cuadra, se ve
        // en qué fila.
        WalletDTO dto = wallet.resumen(ANA);
        BigDecimal suma = dto.getMovimientos().stream()
                .map(m -> m.getMonto()).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(0, suma.compareTo(dto.getSaldo()));
    }

    /* ── La misma plata no entra dos veces ── */

    @Test
    @DisplayName("Dos abonos con la misma referencia acreditan una sola vez")
    void noAcreditaDosVeces() {
        wallet.abonar(ANA, new BigDecimal("100.00"), "recarga:WAL-1", "recarga", Tipo.ABONO);
        wallet.abonar(ANA, new BigDecimal("100.00"), "recarga:WAL-1", "recarga", Tipo.ABONO);

        assertEquals(0, new BigDecimal("100.00").compareTo(wallet.saldoDe(ANA)));
        assertEquals(1, libro.size(), "el reintento no puede dejar un segundo movimiento");
    }

    @Test
    @DisplayName("Un abono sin referencia no se acredita: nada lo frenaría dos veces")
    void sinReferenciaNoAcredita() {
        // La columna es única, pero acepta vacíos, y MySQL permite tantos vacíos
        // como quieras: un abono sin referencia no tiene ninguna defensa contra
        // entrar dos veces. Pasó con el saldo a favor de un viaje cancelado, que
        // se escribía a mano y sin referencia.
        for (String sin : new String[] { null, "", "   " }) {
            assertThrows(RuntimeException.class,
                    () -> wallet.abonar(ANA, new BigDecimal("50.00"), sin, "recarga", Tipo.ABONO),
                    "aceptó un abono sin referencia: " + sin);
        }
        assertTrue(libro.isEmpty(), "dejó un movimiento que nadie puede volver a identificar");
    }

    @Test
    @DisplayName("Dos cobros con la misma referencia descuentan una sola vez")
    void noCobraDosVeces() {
        wallet.abonar(ANA, new BigDecimal("100.00"), "r-1", "recarga", Tipo.ABONO);
        wallet.consumir(ANA, new BigDecimal("40.00"), "venta:v-9", "pasaje");
        wallet.consumir(ANA, new BigDecimal("40.00"), "venta:v-9", "pasaje");

        assertEquals(0, new BigDecimal("60.00").compareTo(wallet.saldoDe(ANA)));
    }

    /* ── El saldo nunca queda negativo ── */

    @Test
    @DisplayName("Si no alcanza, no se cobra nada: no hay pagos a medias")
    void noDejaSaldoNegativo() {
        wallet.abonar(ANA, new BigDecimal("30.00"), "r-1", "recarga", Tipo.ABONO);

        RuntimeException e = assertThrows(RuntimeException.class,
                () -> wallet.consumir(ANA, new BigDecimal("50.00"), "venta:v-1", "pasaje"));
        assertTrue(e.getMessage().toLowerCase().contains("falta saldo"));

        assertEquals(0, new BigDecimal("30.00").compareTo(wallet.saldoDe(ANA)));
        assertEquals(1, libro.size(), "el cobro fallido no puede dejar rastro de cobro");
    }

    @Test
    @DisplayName("Gastar toma el bloqueo del cliente: sin eso, dos compras a la vez gastan lo mismo")
    void gastarSerializaPorCliente() {
        wallet.abonar(ANA, new BigDecimal("50.00"), "r-1", "recarga", Tipo.ABONO);
        wallet.consumir(ANA, new BigDecimal("50.00"), "venta:v-1", "pasaje");

        ClienteRepository usado = (ClienteRepository) ReflectionTestUtils.getField(wallet, "clientes");
        verify(usado).bloquearPorEmail(ANA);
        verify(usado, never()).findByEmail(ANA);   // findByEmail no bloquea nada
    }

    @Test
    @DisplayName("Para cobrar, el saldo se lee con candado y nunca con la consulta de mostrar")
    void cobrarLeeConCandado() {
        // Esto guarda un error que ya pasó y costó un pasaje regalado: con la
        // lectura corriente, MySQL en REPEATABLE READ devuelve la foto que la
        // transacción sacó ANTES de tomar el candado, y dos pagos simultáneos
        // gastaron los mismos S/ 90 — el saldo terminó en −90. Un SUM corriente
        // acá es el bug de vuelta, así que la prueba lo prohíbe explícitamente.
        wallet.abonar(ANA, new BigDecimal("90.00"), "r-1", "recarga", Tipo.ABONO);
        clearInvocations(movimientos);

        wallet.consumir(ANA, new BigDecimal("90.00"), "venta:v-1", "pasaje");

        verify(movimientos).bloquearMovimientosDe(ANA);
        verify(movimientos, never()).saldoDe(anyString());
    }

    /* ── Con la wallet apagada ── */

    @Test
    @DisplayName("Apagada no se gasta ni se recarga, pero el saldo viejo se sigue viendo")
    void apagadaNoMuevePlata() {
        wallet.abonar(ANA, new BigDecimal("40.00"), "r-1", "cancelación", Tipo.SALDO_FAVOR);
        ReflectionTestUtils.setField(wallet, "habilitada", false);

        assertThrows(RuntimeException.class,
                () -> wallet.consumir(ANA, new BigDecimal("10.00"), "venta:v-1", "pasaje"));
        assertThrows(RuntimeException.class,
                () -> wallet.iniciarRecarga(ANA, new BigDecimal("50.00")));

        // Pero el saldo a favor de una cancelación existe desde antes que la
        // wallet: esconderlo sería esconderle plata suya.
        WalletDTO dto = wallet.resumen(ANA);
        assertFalse(dto.isHabilitada());
        assertEquals(0, new BigDecimal("40.00").compareTo(dto.getSaldo()));
        assertEquals(1, dto.getMovimientos().size());
    }

    /* ── Recargar: lo que se acredita es lo que se pagó ── */

    @Test
    @DisplayName("Una recarga pagada por menos NO acredita nada")
    void noAcreditaMasDeLoPagado() {
        String id = wallet.iniciarRecarga(ANA, new BigDecimal("500.00")).recargaId();
        cuandoIzipayDiga(pago(id, 2000));    // pagó S/ 20 y pide acreditar S/ 500

        RuntimeException e = assertThrows(RuntimeException.class,
                () -> wallet.confirmarRecarga(ANA, id, "{}", "firma"));
        assertTrue(e.getMessage().toLowerCase().contains("no coincide"));

        assertEquals(0, BigDecimal.ZERO.compareTo(wallet.saldoDe(ANA)));
        assertEquals(RecargaWallet.Estado.FALLIDA, recargasGuardadas.get(0).getEstado());
    }

    @Test
    @DisplayName("Una respuesta de pago de OTRO pedido no acredita esta recarga")
    void noAcreditaConElPagoDeOtroPedido() {
        String id = wallet.iniciarRecarga(ANA, new BigDecimal("100.00")).recargaId();
        cuandoIzipayDiga(pago("WAL-OTRA", 10000));

        assertThrows(RuntimeException.class, () -> wallet.confirmarRecarga(ANA, id, "{}", "firma"));
        assertEquals(0, BigDecimal.ZERO.compareTo(wallet.saldoDe(ANA)));
    }

    @Test
    @DisplayName("Una recarga pagada por el monto correcto acredita exactamente eso")
    void acreditaLoPagado() {
        String id = wallet.iniciarRecarga(ANA, new BigDecimal("100.00")).recargaId();
        cuandoIzipayDiga(pago(id, 10000));

        WalletDTO dto = wallet.confirmarRecarga(ANA, id, "{}", "firma");

        assertEquals(0, new BigDecimal("100.00").compareTo(dto.getSaldo()));
        assertEquals(Tipo.ABONO.name(), dto.getMovimientos().get(0).getTipo());
        assertEquals(RecargaWallet.Estado.PAGADA, recargasGuardadas.get(0).getEstado());
    }

    @Test
    @DisplayName("Si el pago no quedó aprobado, la recarga queda fallida y sin saldo")
    void pagoRechazadoNoAcredita() {
        String id = wallet.iniciarRecarga(ANA, new BigDecimal("100.00")).recargaId();
        IzipayService.Resultado r = new IzipayService.Resultado();
        r.pagado = false;
        r.motivo = "El pago quedó en estado REFUSED";
        cuandoIzipayDiga(r);

        assertThrows(RuntimeException.class, () -> wallet.confirmarRecarga(ANA, id, "{}", "firma"));
        assertEquals(0, BigDecimal.ZERO.compareTo(wallet.saldoDe(ANA)));
        assertEquals(RecargaWallet.Estado.FALLIDA, recargasGuardadas.get(0).getEstado());
    }

    @Test
    @DisplayName("El IPN y la vuelta del navegador son el mismo pago: acredita una vez")
    void elIpnYElNavegadorNoDuplican() {
        String id = wallet.iniciarRecarga(ANA, new BigDecimal("100.00")).recargaId();

        // Dos avisos del mismo pago, con uuid de transacción distinto cada uno:
        // por eso la referencia del movimiento es la recarga y no el uuid.
        IzipayService.Resultado porIpn = pago(id, 10000);
        porIpn.referencia = "uuid-del-ipn";
        wallet.acreditarDesdeIpn(id, porIpn);

        IzipayService.Resultado porNavegador = pago(id, 10000);
        porNavegador.referencia = "uuid-del-navegador";
        cuandoIzipayDiga(porNavegador);
        wallet.confirmarRecarga(ANA, id, "{}", "firma");

        assertEquals(0, new BigDecimal("100.00").compareTo(wallet.saldoDe(ANA)));
        assertEquals(1, libro.size(), "el mismo pago avisado dos veces es un solo abono");
    }

    @Test
    @DisplayName("En modo simulación se acredita lo pedido: no hubo cobro que comparar")
    void enSimulacionAcreditaLoPedido() {
        String id = wallet.iniciarRecarga(ANA, new BigDecimal("50.00")).recargaId();
        IzipayService.Resultado r = new IzipayService.Resultado();
        r.pagado = true;
        r.simulado = true;
        r.referencia = "izipay_simulado_abc";
        cuandoIzipayDiga(r);

        assertEquals(0, new BigDecimal("50.00").compareTo(
                wallet.confirmarRecarga(ANA, id, "{}", "firma").getSaldo()));
    }

    /* ── Topes de la recarga ── */

    @Test
    @DisplayName("Respeta el mínimo, el máximo por recarga y el techo del saldo")
    void respetaLosTopes() {
        assertThrows(RuntimeException.class, () -> wallet.iniciarRecarga(ANA, new BigDecimal("5.00")));
        assertThrows(RuntimeException.class, () -> wallet.iniciarRecarga(ANA, new BigDecimal("5000.00")));
        assertThrows(RuntimeException.class, () -> wallet.iniciarRecarga(ANA, new BigDecimal("20.004")));

        wallet.abonar(ANA, new BigDecimal("2900.00"), "r-1", "recarga", Tipo.ABONO);
        RuntimeException e = assertThrows(RuntimeException.class,
                () -> wallet.iniciarRecarga(ANA, new BigDecimal("500.00")));
        assertTrue(e.getMessage().contains("máximo"));
    }

    /* ── Si la compra se cae después de descontar ── */

    @Test
    @DisplayName("Devolver repone exactamente lo cobrado, y solo una vez")
    void devolverReponeUnaSolaVez() {
        wallet.abonar(ANA, new BigDecimal("100.00"), "r-1", "recarga", Tipo.ABONO);
        wallet.consumir(ANA, new BigDecimal("80.00"), "venta:v-1", "pasaje");
        assertEquals(0, new BigDecimal("20.00").compareTo(wallet.saldoDe(ANA)));

        wallet.devolver("venta:v-1", "no se pudo cerrar la compra");
        wallet.devolver("venta:v-1", "no se pudo cerrar la compra");

        assertEquals(0, new BigDecimal("100.00").compareTo(wallet.saldoDe(ANA)),
                "reponer dos veces sería regalar plata");
    }

    @Test
    @DisplayName("No devuelve nada de un cobro que nunca ocurrió")
    void noDevuelveLoQueNoSeCobro() {
        wallet.devolver("venta:inexistente", "nada");
        assertEquals(0, BigDecimal.ZERO.compareTo(wallet.saldoDe(ANA)));
        assertTrue(libro.isEmpty());
    }

    /* ── Ayudas ── */

    private void cuandoIzipayDiga(IzipayService.Resultado r) {
        izipay.respuesta = r;
    }

    /**
     * Doble a mano en vez de un mock: Mockito no puede instrumentar las clases de
     * servicio en el JDK de esta máquina —solo las interfaces de los repositorios—,
     * y de todas formas lo único que hace falta es decidir qué contesta la pasarela.
     */
    /* ── Recargar con Yape ──
       Es el medio con el que paga la gente acá. Lo que cambia respecto de la
       tarjeta no es el botón: con Yape el cobro lo arma el servidor, así que el
       navegador no tiene nada que falsificar. */

    @Test
    @DisplayName("Con Yape se cobra el monto anotado, no el que diga el navegador")
    void conYapeElMontoLoPoneElServidor() {
        var r = wallet.iniciarRecarga(ANA, new BigDecimal("120.00"), WalletService.Medio.YAPE);

        wallet.confirmarRecargaYape(ANA, r.recargaId(), "token-del-sdk", "dev-1");

        assertEquals(0, new BigDecimal("120.00").compareTo(wallet.saldoDe(ANA)));
        assertEquals(0, new BigDecimal("120.00").compareTo(mercadoPago.montoCobrado),
                "Se cobró un monto distinto del que se había anotado");
    }

    @Test
    @DisplayName("Con Yape no se le pide formulario a Izipay")
    void conYapeNoSeTocaIzipay() {
        // Pedirlo dejaba un pedido abierto en la pasarela cada vez que alguien
        // elegía Yape: órdenes que nadie iba a pagar y que hay que explicar
        // después, al conciliar.
        wallet.iniciarRecarga(ANA, new BigDecimal("50.00"), WalletService.Medio.YAPE);
        assertEquals(0, izipay.formulariosPedidos, "Se abrió un pedido en Izipay para un pago con Yape");

        wallet.iniciarRecarga(ANA, new BigDecimal("50.00"), WalletService.Medio.TARJETA);
        assertEquals(1, izipay.formulariosPedidos, "Con tarjeta sí hace falta el formulario");
    }

    @Test
    @DisplayName("Confirmar dos veces la misma recarga con Yape no acredita el doble")
    void yapeNoAcreditaDosVeces() {
        var r = wallet.iniciarRecarga(ANA, new BigDecimal("80.00"), WalletService.Medio.YAPE);

        wallet.confirmarRecargaYape(ANA, r.recargaId(), "token", "dev-1");
        wallet.confirmarRecargaYape(ANA, r.recargaId(), "token", "dev-1");

        assertEquals(0, new BigDecimal("80.00").compareTo(wallet.saldoDe(ANA)));
    }

    @Test
    @DisplayName("Si Yape rechaza el pago no se acredita nada")
    void yapeRechazadoNoAcredita() {
        mercadoPago.aprobar = false;
        var r = wallet.iniciarRecarga(ANA, new BigDecimal("80.00"), WalletService.Medio.YAPE);

        assertThrows(RuntimeException.class,
                () -> wallet.confirmarRecargaYape(ANA, r.recargaId(), "token", "dev-1"));
        assertEquals(0, BigDecimal.ZERO.compareTo(wallet.saldoDe(ANA)));
    }

    @Test
    @DisplayName("La recarga de otro no se confirma con tu sesión")
    void laRecargaEsDeQuienLaInicio() {
        var r = wallet.iniciarRecarga(ANA, new BigDecimal("80.00"), WalletService.Medio.YAPE);

        assertThrows(RuntimeException.class,
                () -> wallet.confirmarRecargaYape("otro@ejemplo.pe", r.recargaId(), "token", "dev-1"));
        assertEquals(0, BigDecimal.ZERO.compareTo(wallet.saldoDe(ANA)));
    }

    private static class MercadoPagoFalso extends MercadoPagoService {
        boolean aprobar = true;
        BigDecimal montoCobrado;

        @Override
        public Resultado pagar(String token, BigDecimal monto, String descripcion,
                               Pagador pagador, String idempotencia,
                               String referenciaExterna, String deviceId) {
            montoCobrado = monto;
            Resultado r = new Resultado();
            r.pagado = aprobar;
            r.referencia = "uuid-mercadopago";
            r.motivo = aprobar ? null : "Yape rechazó el pago";
            return r;
        }
    }

    private static class IzipayFalso extends IzipayService {
        IzipayService.Resultado respuesta;

        int formulariosPedidos = 0;

        @Override
        public Formulario crearFormulario(String orderId, int montoCents, String email,
                                          String nombre, String documento, String telefono) {
            formulariosPedidos++;
            return new Formulario();
        }

        @Override
        public Resultado verificarPago(String krAnswer, String krHash) {
            return respuesta;
        }
    }

    private static IzipayService.Resultado pago(String orderId, int montoCents) {
        IzipayService.Resultado r = new IzipayService.Resultado();
        r.pagado = true;
        r.orderId = orderId;
        r.montoCents = montoCents;
        r.referencia = "uuid-izipay";
        return r;
    }
}
