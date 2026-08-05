package com.example.demo.service;

import com.example.demo.model.*;
import com.example.demo.repository.SaldoMovimientoRepository;
import com.example.demo.repository.VentaRepository;
import com.example.demo.repository.ViajeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Cancelación de viajes y qué hacer con los pasajes ya vendidos.
 *
 * Cancelar NO mueve dinero: solo marca cada pasaje como "por resolver". Después,
 * pasajero por pasajero, alguien decide si se devuelve, se reprograma o se deja
 * como saldo a favor. Se hizo así a propósito: ninguna plata sale de una caja
 * sin que una persona lo confirme.
 */
@Service
public class CancelacionService {

    private final ViajeRepository viajeRepository;
    private final VentaRepository ventaRepository;
    private final SaldoMovimientoRepository saldoRepository;
    private final AsientoService asientoService;
    private final CajaService cajaService;
    private final AuditoriaService auditoriaService;

    public CancelacionService(ViajeRepository viajeRepository,
                              VentaRepository ventaRepository,
                              SaldoMovimientoRepository saldoRepository,
                              AsientoService asientoService,
                              CajaService cajaService,
                              AuditoriaService auditoriaService) {
        this.viajeRepository = viajeRepository;
        this.ventaRepository = ventaRepository;
        this.saldoRepository = saldoRepository;
        this.asientoService = asientoService;
        this.cajaService = cajaService;
        this.auditoriaService = auditoriaService;
    }

    /** Cancela el viaje y deja sus pasajes pagados marcados como "por resolver". */
    @Transactional
    public Viaje cancelarViaje(String viajeId, String motivo, String usuarioNombre) {
        Viaje v = viajeRepository.findById(viajeId)
                .orElseThrow(() -> new RuntimeException("Viaje no encontrado"));

        if (v.getEstado() == Viaje.EstadoViaje.CANCELADO)
            throw new RuntimeException("Este viaje ya estaba cancelado");
        if (v.getEstado() == Viaje.EstadoViaje.COMPLETADO)
            throw new RuntimeException("No se puede cancelar un viaje ya completado");
        if (motivo == null || motivo.trim().length() < 5)
            throw new RuntimeException("Indica el motivo de la cancelación");

        v.setEstado(Viaje.EstadoViaje.CANCELADO);
        v.setMotivoCancelacion(motivo.trim());
        v.setCanceladoAt(LocalDateTime.now());
        viajeRepository.save(v);

        // Los pasajes pagados quedan pendientes de resolver (no se toca el dinero)
        List<Venta> afectadas = ventaRepository.findByViajeId(viajeId).stream()
                .filter(x -> x.getEstado() == Venta.EstadoVenta.PAGADO)
                .collect(Collectors.toList());
        for (Venta venta : afectadas) {
            venta.setResolucion(Venta.Resolucion.PENDIENTE);
            ventaRepository.save(venta);
        }

        auditoriaService.registrar("CANCELAR", "VIAJES", v.getId(),
                "Viaje " + v.getCodigoViaje() + " cancelado (" + motivo.trim() + "). "
                        + afectadas.size() + " pasaje(s) por resolver");

        return v;
    }

    /** Pasajes de viajes cancelados que todavía nadie resolvió. */
    public List<Venta> pendientesDeResolver() {
        return ventaRepository.findByResolucion(Venta.Resolucion.PENDIENTE);
    }

    /**
     * Devuelve el dinero: anula el pasaje y registra el egreso en la caja de
     * quien entrega la plata (por eso se confirma acá y no al cancelar).
     */
    @Transactional
    public Venta devolver(String ventaId, String usuarioNombre) {
        Venta v = paraResolver(ventaId);

        v.setEstado(Venta.EstadoVenta.ANULADO);
        v.setAnuladaAt(LocalDateTime.now());
        v.setResolucion(Venta.Resolucion.DEVUELTO);
        ventaRepository.save(v);
        asientoService.liberarAsiento(ventaId);

        cajaService.registrarMovimientoAutomatico(usuarioNombre,
                MovimientoCaja.TipoMovimiento.EGRESO, v.getPrecio(),
                "Devolución por viaje cancelado " + v.getViajeCodigo()
                        + " — " + v.getPasajeroNombre(),
                v.getMetodoPago());

        auditoriaService.registrar("DEVOLVER", "VENTAS", v.getId(),
                "Devolución S/ " + v.getPrecio() + " a " + v.getPasajeroNombre()
                        + " por cancelación de " + v.getViajeCodigo());
        return v;
    }

    /**
     * Guarda el monto como saldo a favor del cliente. No sale plata de la caja:
     * queda como crédito para una compra futura.
     */
    @Transactional
    public Venta dejarSaldoAFavor(String ventaId, String usuarioNombre) {
        Venta v = paraResolver(ventaId);

        String email = v.getClienteEmail();
        if (email == null || email.isBlank())
            throw new RuntimeException("Este pasaje no tiene correo del cliente: no se puede guardar saldo. Usa devolución.");

        v.setEstado(Venta.EstadoVenta.ANULADO);
        v.setAnuladaAt(LocalDateTime.now());
        v.setResolucion(Venta.Resolucion.SALDO_FAVOR);
        ventaRepository.save(v);
        asientoService.liberarAsiento(ventaId);

        SaldoMovimiento m = new SaldoMovimiento();
        m.setId(UUID.randomUUID().toString());
        m.setClienteEmail(email.trim().toLowerCase());
        m.setClienteDocumento(v.getPasajeroDocumento());
        m.setClienteNombre(v.getPasajeroNombre());
        m.setMonto(v.getPrecio());
        m.setMotivo("Saldo a favor por cancelación del viaje " + v.getViajeCodigo());
        m.setVentaId(v.getId());
        m.setUsuarioNombre(usuarioNombre);
        m.setCreatedAt(LocalDateTime.now());
        saldoRepository.save(m);

        auditoriaService.registrar("SALDO_FAVOR", "VENTAS", v.getId(),
                "Saldo a favor S/ " + v.getPrecio() + " para " + email
                        + " por cancelación de " + v.getViajeCodigo());
        return v;
    }

    /**
     * Reprograma: mueve el pasaje a otro viaje conservando al pasajero y el
     * precio ya cobrado. El asiento del viaje viejo se libera.
     */
    @Transactional
    public Venta reprogramar(String ventaId, String nuevoViajeId, Integer nuevoAsiento, String usuarioNombre) {
        Venta v = paraResolver(ventaId);

        Viaje destino = viajeRepository.findById(nuevoViajeId)
                .orElseThrow(() -> new RuntimeException("El viaje nuevo no existe"));
        if (destino.getEstado() != Viaje.EstadoViaje.PROGRAMADO)
            throw new RuntimeException("Solo se puede reprogramar a un viaje programado");
        if (destino.getId().equals(v.getViajeId()))
            throw new RuntimeException("Elige un viaje distinto al cancelado");

        asientoService.liberarAsiento(ventaId);

        v.setViajeId(destino.getId());
        v.setViajeCodigo(destino.getCodigoViaje());
        v.setViajeDescripcion(destino.getRutaNombre());
        if (nuevoAsiento != null) v.setAsientoNumero(nuevoAsiento);
        v.setEmbarqueEstado(Venta.EmbarqueEstado.PENDIENTE);
        v.setResolucion(Venta.Resolucion.REPROGRAMADO);
        ventaRepository.save(v);

        auditoriaService.registrar("REPROGRAMAR", "VENTAS", v.getId(),
                "Pasaje de " + v.getPasajeroNombre() + " reprogramado a "
                        + destino.getCodigoViaje() + " (" + destino.getFechaSalida() + ")");
        return v;
    }

    /** Saldo disponible de un cliente. */
    public BigDecimal saldoDe(String email) {
        if (email == null || email.isBlank()) return BigDecimal.ZERO;
        BigDecimal s = saldoRepository.saldoDe(email.trim());
        return s != null ? s : BigDecimal.ZERO;
    }

    public List<SaldoMovimiento> movimientosDe(String email) {
        if (email == null || email.isBlank()) return List.of();
        return saldoRepository.findByClienteEmailIgnoreCaseOrderByCreatedAtDesc(email.trim());
    }

    private Venta paraResolver(String ventaId) {
        Venta v = ventaRepository.findById(ventaId)
                .orElseThrow(() -> new RuntimeException("Pasaje no encontrado"));
        if (v.getResolucion() == null)
            throw new RuntimeException("Este pasaje no está pendiente de resolver");
        if (v.getResolucion() != Venta.Resolucion.PENDIENTE)
            throw new RuntimeException("Este pasaje ya se resolvió (" + v.getResolucion().name() + ")");
        return v;
    }
}
