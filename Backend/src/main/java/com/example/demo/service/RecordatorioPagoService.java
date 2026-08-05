package com.example.demo.service;

import com.example.demo.model.Venta;
import com.example.demo.model.Viaje;
import com.example.demo.repository.VentaRepository;
import com.example.demo.repository.ViajeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Avisa por correo al cliente que dejó su compra a medias, mientras el asiento
 * todavía está retenido.
 *
 * Se dispara por dos caminos, porque ninguno cubre todos los casos:
 *
 *   1. Izipay llama a la "URL de notificación al abandonar" cuando el comprador
 *      cierra el formulario de pago. Es inmediato, pero solo existe para tarjeta.
 *   2. Un recordatorio automático revisa las reservas que están por vencer. Cubre
 *      lo que la pasarela no ve: cerrar la pestaña, quedarse sin señal, o abandonar
 *      el pago con Yape.
 *
 * El correo se manda una sola vez por reserva (columna aviso_pago_enviado), así
 * que los dos caminos pueden coincidir sin molestar dos veces al cliente.
 */
@Service
public class RecordatorioPagoService {

    /** Se avisa cuando a la reserva le quedan menos de estos minutos. */
    private static final int MINUTOS_ANTES = 10;

    private final VentaRepository ventaRepository;
    private final ViajeRepository viajeRepository;
    private final EmailService emailService;

    /** Dominio de la web del cliente: de ahí sale el enlace para terminar el pago. */
    @Value("${app.web.url:http://localhost:5173}")
    private String webUrl;

    public RecordatorioPagoService(VentaRepository ventaRepository,
                                   ViajeRepository viajeRepository,
                                   EmailService emailService) {
        this.ventaRepository = ventaRepository;
        this.viajeRepository = viajeRepository;
        this.emailService = emailService;
    }

    // ------------------------------------------------------------------ disparadores

    /** Aviso inmediato: el comprador abandonó el formulario de Izipay. */
    @Transactional
    public String avisarPorOrden(String ordenPago) {
        if (ordenPago == null || ordenPago.isBlank()) return "Sin orden de pago";
        List<Venta> ventas = ventaRepository.findByOrdenPago(ordenPago).stream()
                .filter(this::sigueEsperandoPago)
                .toList();
        if (ventas.isEmpty()) return "No hay reservas pendientes para " + ordenPago;
        return avisar(ventas) ? "Aviso enviado" : "Ya se había avisado";
    }

    /**
     * Recordatorio automático. Corre cada minuto y solo mira la ventana de reservas
     * a punto de vencer: si el cliente todavía está pagando, no le llega nada.
     */
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void recordarReservasPorVencer() {
        LocalDateTime ahora = LocalDateTime.now();
        List<Venta> porVencer = ventaRepository
                .findByEstadoAndAvisoPagoEnviadoIsNullAndReservaExpiraBetween(
                        Venta.EstadoVenta.RESERVADO, ahora, ahora.plusMinutes(MINUTOS_ANTES));
        if (porVencer.isEmpty()) return;

        // Una compra puede tener varios asientos: se agrupan para mandar un solo correo.
        Map<String, List<Venta>> porCompra = new LinkedHashMap<>();
        for (Venta v : porVencer) {
            if (!sigueEsperandoPago(v)) continue;
            porCompra.computeIfAbsent(claveDeCompra(v), k -> new ArrayList<>()).add(v);
        }
        for (List<Venta> compra : porCompra.values()) {
            try {
                avisar(compra);
            } catch (Exception e) {
                System.err.println("[RecordatorioPago] No se pudo avisar: " + e.getMessage());
            }
        }
    }

    /**
     * Lo que salió junto a la pasarela es una sola compra; si nunca llegó a la
     * pasarela (abandonó antes), se agrupa por cliente, que es lo más cercano.
     */
    private String claveDeCompra(Venta v) {
        if (v.getOrdenPago() != null && !v.getOrdenPago().isBlank()) return v.getOrdenPago();
        return "cliente:" + (v.getClienteEmail() == null ? v.getId() : v.getClienteEmail().toLowerCase());
    }

    private boolean sigueEsperandoPago(Venta v) {
        return v.getEstado() == Venta.EstadoVenta.RESERVADO
                && v.getReservaExpira() != null
                && v.getReservaExpira().isAfter(LocalDateTime.now());
    }

    // ------------------------------------------------------------------ envío

    /** Manda el correo y marca las reservas como avisadas. Devuelve si envió algo. */
    private boolean avisar(List<Venta> ventas) {
        List<Venta> sinAvisar = ventas.stream()
                .filter(v -> v.getAvisoPagoEnviado() == null)
                .toList();
        if (sinAvisar.isEmpty()) return false;

        Venta primera = sinAvisar.get(0);
        String correo = primera.getClienteEmail();
        if (correo == null || correo.isBlank() || !correo.contains("@")) {
            marcarAvisadas(sinAvisar);          // sin correo no hay nada que hacer
            return false;
        }

        long minutos = Math.max(1, Duration.between(LocalDateTime.now(), primera.getReservaExpira()).toMinutes());
        BigDecimal total = sinAvisar.stream()
                .map(v -> v.getPrecio() == null ? BigDecimal.ZERO : v.getPrecio())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        String fechaSalida = "";
        String horaSalida = "";
        Viaje viaje = primera.getViajeId() == null ? null
                : viajeRepository.findById(primera.getViajeId()).orElse(null);
        if (viaje != null) {
            fechaSalida = viaje.getFechaSalida() != null ? viaje.getFechaSalida().toString() : "";
            horaSalida  = viaje.getHoraSalida()  != null ? viaje.getHoraSalida().toString().substring(0, 5) : "";
        }

        String asientos = sinAvisar.stream()
                .map(v -> "#" + v.getAsientoNumero())
                .collect(Collectors.joining(", "));

        try {
            emailService.enviarPagoPendiente(
                    correo,
                    primera.getPasajeroNombre(),
                    texto(primera.getParadaOrigen()) + " - " + texto(primera.getParadaDestino()),
                    fechaSalida, horaSalida, asientos, sinAvisar.size(), total, minutos,
                    enlaceDePago(sinAvisar));
        } catch (Exception e) {
            System.err.println("[RecordatorioPago] Falló el correo a " + correo + ": " + e.getMessage());
            return false;                        // sin marcar: se reintenta al minuto siguiente
        }

        marcarAvisadas(sinAvisar);
        System.out.println("[RecordatorioPago] Aviso de pago pendiente enviado a " + correo
                + " (" + sinAvisar.size() + " pasaje(s), vence en " + minutos + " min)");
        return true;
    }

    private void marcarAvisadas(List<Venta> ventas) {
        LocalDateTime ahora = LocalDateTime.now();
        for (Venta v : ventas) {
            v.setAvisoPagoEnviado(ahora);
            ventaRepository.save(v);
        }
    }

    /**
     * Enlace para terminar el pago. Lleva los identificadores de las reservas, que
     * son UUID: no se pueden adivinar, así que el enlace del correo alcanza sin
     * pedirle al cliente que inicie sesión.
     */
    private String enlaceDePago(List<Venta> ventas) {
        String ids = ventas.stream().map(Venta::getId).collect(Collectors.joining(","));
        String base = webUrl.endsWith("/") ? webUrl.substring(0, webUrl.length() - 1) : webUrl;
        return base + "/pagar-reserva?ids=" + URLEncoder.encode(ids, StandardCharsets.UTF_8);
    }

    private String texto(String s) { return s == null ? "" : s; }
}
