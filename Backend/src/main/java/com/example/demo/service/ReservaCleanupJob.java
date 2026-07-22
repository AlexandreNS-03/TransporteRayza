package com.example.demo.service;

import com.example.demo.model.Venta;
import com.example.demo.repository.VentaRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Libera los asientos de reservas que no se pagaron dentro del plazo: anula la venta
 * RESERVADA vencida y devuelve el asiento a LIBRE. Corre cada minuto.
 */
@Component
public class ReservaCleanupJob {

    private final VentaRepository ventaRepository;
    private final AsientoService asientoService;

    public ReservaCleanupJob(VentaRepository ventaRepository, AsientoService asientoService) {
        this.ventaRepository = ventaRepository;
        this.asientoService = asientoService;
    }

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void liberarReservasVencidas() {
        List<Venta> vencidas = ventaRepository.findByEstadoAndReservaExpiraBefore(
                Venta.EstadoVenta.RESERVADO, LocalDateTime.now());

        for (Venta v : vencidas) {
            v.setEstado(Venta.EstadoVenta.ANULADO);
            v.setAnuladaAt(LocalDateTime.now());
            ventaRepository.save(v);
            try {
                asientoService.liberarAsiento(v.getId());
            } catch (Exception e) {
                System.err.println("[ReservaCleanup] No se pudo liberar el asiento de la venta "
                        + v.getId() + ": " + e.getMessage());
            }
        }
        if (!vencidas.isEmpty())
            System.out.println("[ReservaCleanup] Reservas vencidas liberadas: " + vencidas.size());
    }
}
