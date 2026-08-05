package com.example.demo.service;

import com.example.demo.model.Encomienda;
import com.example.demo.model.Venta;
import com.example.demo.repository.EncomiendaRepository;
import com.example.demo.repository.VentaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Procesa la notificación IPN de Izipay.
 *
 * Es idempotente a propósito: la notificación puede llegar antes, después o
 * además de la confirmación del navegador, e Izipay reintenta si no responde.
 * Si el pedido ya está pagado, no se hace nada y se responde OK.
 */
@Service
public class IzipayIpnService {

    private final IzipayService izipayService;
    private final VentaRepository ventaRepository;
    private final EncomiendaRepository encomiendaRepository;
    private final ReservaService reservaService;
    private final AuditoriaService auditoriaService;
    private final RecordatorioPagoService recordatorioPagoService;

    public IzipayIpnService(IzipayService izipayService,
                            VentaRepository ventaRepository,
                            EncomiendaRepository encomiendaRepository,
                            ReservaService reservaService,
                            AuditoriaService auditoriaService,
                            RecordatorioPagoService recordatorioPagoService) {
        this.recordatorioPagoService = recordatorioPagoService;
        this.izipayService = izipayService;
        this.ventaRepository = ventaRepository;
        this.encomiendaRepository = encomiendaRepository;
        this.reservaService = reservaService;
        this.auditoriaService = auditoriaService;
    }

    @Transactional
    public String procesar(String krAnswer, String krHash, String krHashKey) {
        IzipayService.Resultado res = izipayService.verificarIpn(krAnswer, krHash, krHashKey);
        if (!res.pagado) {
            // Firma inválida o pago no aprobado: no se toca nada.
            return "Ignorada: " + (res.motivo != null ? res.motivo : "pago no aprobado");
        }

        String orderId = izipayService.orderIdDe(krAnswer);
        if (orderId == null || orderId.isBlank()) return "Sin orderId";

        // ── Encomienda pagada desde la web ──
        if (orderId.startsWith("ENC-")) {
            Encomienda e = encomiendaRepository.findByCodigoEncomienda(orderId).orElse(null);
            if (e == null) return "Encomienda no encontrada: " + orderId;
            if (e.getEstadoPago() == Encomienda.EstadoPago.PAGADO) return "Ya estaba pagada";

            e.setEstadoPago(Encomienda.EstadoPago.PAGADO);
            e.setPasarelaReferencia(res.referencia);
            encomiendaRepository.save(e);
            auditoriaService.registrar("PAGO_IPN", "ENCOMIENDAS", e.getId(),
                    "Encomienda " + orderId + " confirmada por notificación de Izipay");
            return "Encomienda confirmada";
        }

        // ── Pasajes (compra individual o de grupo) ──
        List<Venta> ventas = ventaRepository.findByOrdenPago(orderId);
        if (ventas.isEmpty()) return "Pedido no encontrado: " + orderId;

        List<Venta> pendientes = ventas.stream()
                .filter(v -> v.getEstado() == Venta.EstadoVenta.RESERVADO)
                .toList();
        if (pendientes.isEmpty()) return "Ya estaba pagado";

        reservaService.confirmarDesdeIpn(pendientes, res.referencia);
        auditoriaService.registrar("PAGO_IPN", "VENTAS", pendientes.get(0).getId(),
                "Pedido " + orderId + " (" + pendientes.size() + " pasaje(s)) confirmado "
                        + "por notificación de Izipay");
        return "Pago confirmado";
    }

    /**
     * Aviso de abandono: el comprador cerró el formulario sin pagar. No se toca la
     * venta (el asiento sigue retenido hasta que venza); solo se le escribe para que
     * pueda terminar el pago a tiempo.
     */
    @Transactional
    public String procesarAbandono(String krAnswer, String krHash, String krHashKey) {
        if (!izipayService.firmaIpnValida(krAnswer, krHash, krHashKey))
            return "Ignorada: la notificación no es auténtica";

        String orderId = izipayService.orderIdDe(krAnswer);
        if (orderId == null || orderId.isBlank()) return "Sin orderId";

        // Las encomiendas se pagan sin retener nada: no hay plazo que avisar.
        if (orderId.startsWith("ENC-")) return "Encomienda: sin aviso de abandono";

        return recordatorioPagoService.avisarPorOrden(orderId);
    }
}
