package com.example.demo.service;

import com.example.demo.model.Venta;
import com.example.demo.repository.VentaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Quién cobró la venta, aparte de con qué pagó el pasajero.
 *
 * <p>Son dos preguntas distintas y hasta ahora se contestaban con un solo dato.
 * Funcionaba mientras hubiera un proveedor por instrumento: TARJETA era Izipay
 * y YAPE era Mercado Pago, y el código lo daba por sentado. Con un segundo
 * proveedor cobrando tarjeta, "TARJETA" ya no dice contra qué liquidación se
 * concilia la venta, y al cierre del mes no hay forma de saber quién debe esa
 * plata.
 */
class ProcesadorDeLaVentaTest {

    private CierrePagoWebService cierre;

    @BeforeEach
    void preparar() {
        VentaRepository ventas = mock(VentaRepository.class);
        when(ventas.save(any(Venta.class))).thenAnswer(i -> i.getArgument(0));
        // Subclase a mano y no un mock: en este JDK Mockito no puede instrumentar
        // AsientoService. Es lo mismo que hacen SaldoAFavorTest y los demás.
        AsientoService asientos = new AsientoService(null, null, null, null) {
            @Override public void confirmarAsiento(String ventaId) { /* no hace falta acá */ }
        };
        cierre = new CierrePagoWebService(ventas, asientos);
    }

    private Venta pendiente() {
        Venta v = new Venta();
        v.setId("v-1");
        v.setEstado(Venta.EstadoVenta.RESERVADO);
        return v;
    }

    @Test
    @DisplayName("La tarjeta cobrada por Izipay queda con los dos datos")
    void tarjetaDeIzipay() {
        Venta v = pendiente();
        cierre.marcarPagadas(List.of(v), "ref-1", "TARJETA", "IZIPAY");

        assertEquals(Venta.EstadoVenta.PAGADO, v.getEstado());
        assertEquals("TARJETA", v.getMetodoPago());
        assertEquals("IZIPAY", v.getProcesador());
    }

    @Test
    @DisplayName("El Yape cobrado por Mercado Pago, igual")
    void yapeDeMercadoPago() {
        Venta v = pendiente();
        cierre.marcarPagadas(List.of(v), "ref-2", "YAPE", "MERCADOPAGO");

        assertEquals("YAPE", v.getMetodoPago());
        assertEquals("MERCADOPAGO", v.getProcesador());
    }

    /* Esta es la razón de existir del campo: que el mismo instrumento lo pueda
       cobrar otro proveedor sin que el sistema pierda de vista cuál fue. Si
       alguna vez el procesador se "dedujera" del método, esta prueba falla. */
    @Test
    @DisplayName("Una TARJETA cobrada por Mercado Pago no se confunde con una de Izipay")
    void tarjetaDeOtroProveedor() {
        Venta v = pendiente();
        cierre.marcarPagadas(List.of(v), "ref-3", "TARJETA", "MERCADOPAGO");

        assertEquals("TARJETA", v.getMetodoPago());
        assertEquals("MERCADOPAGO", v.getProcesador(),
                "El procesador tiene que guardarse, no deducirse del método");
    }

    /* Pagar con el saldo de la wallet no pasa por ninguna pasarela: esa plata se
       cobró el día de la recarga. Poner un proveedor acá sería inventar un cobro
       que no existió, y al conciliar aparecería una venta que la pasarela no
       tiene. */
    @Test
    @DisplayName("Pagar con saldo no inventa un procesador")
    void elSaldoNoTieneProcesador() {
        Venta v = pendiente();
        cierre.marcarPagadas(List.of(v), "saldo-1", "SALDO", null);

        assertEquals("SALDO", v.getMetodoPago());
        assertNull(v.getProcesador());
    }

    /* El reintento del navegador vuelve a cerrar una compra ya cerrada, y llega
       sin método ni procesador. No puede borrar lo que ya se sabía: una venta
       que pierde quién la cobró es una venta que no se puede conciliar. */
    @Test
    @DisplayName("Un cierre repetido sin datos no borra el procesador que ya estaba")
    void elReintentoNoBorra() {
        Venta v = pendiente();
        cierre.marcarPagadas(List.of(v), "ref-4", "TARJETA", "IZIPAY");
        cierre.marcarPagadas(List.of(v), null, null, null);

        assertEquals("TARJETA", v.getMetodoPago());
        assertEquals("IZIPAY", v.getProcesador());
    }

    @Test
    @DisplayName("Una compra de varios pasajes marca el procesador en todos")
    void todaLaCompra() {
        Venta a = pendiente(); a.setId("v-a");
        Venta b = pendiente(); b.setId("v-b");
        cierre.marcarPagadas(List.of(a, b), "ref-5", "YAPE", "MERCADOPAGO");

        assertEquals("MERCADOPAGO", a.getProcesador());
        assertEquals("MERCADOPAGO", b.getProcesador());
    }
}
