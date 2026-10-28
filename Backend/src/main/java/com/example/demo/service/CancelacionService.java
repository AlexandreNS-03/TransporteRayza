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
    private final AlcanceSucursal alcance;
    private final WalletService walletService;

    public CancelacionService(ViajeRepository viajeRepository,
                              VentaRepository ventaRepository,
                              SaldoMovimientoRepository saldoRepository,
                              AsientoService asientoService,
                              CajaService cajaService,
                              AuditoriaService auditoriaService,
                              AlcanceSucursal alcance,
                              WalletService walletService) {
        this.viajeRepository = viajeRepository;
        this.alcance = alcance;
        this.ventaRepository = ventaRepository;
        this.saldoRepository = saldoRepository;
        this.asientoService = asientoService;
        this.cajaService = cajaService;
        this.auditoriaService = auditoriaService;
        this.walletService = walletService;
    }

    /** Cancela el viaje y deja sus pasajes pagados marcados como "por resolver". */
    @Transactional
    public Viaje cancelarViaje(String viajeId, String motivo, String usuarioNombre) {
        Viaje v = viajeRepository.findById(viajeId)
                .orElseThrow(() -> new RuntimeException("Viaje no encontrado"));

        // Cancelar el viaje de otro mostrador deja sin salida a pasajeros que
        // uno ni siquiera vendió.
        alcance.exigirAcceso(usuarioNombre, v);

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
     *
     * <p><strong>Lo pagado con saldo vuelve al saldo</strong>, y entonces no
     * sale nada de la caja. Esa plata nunca entró a la caja —entró a la cuenta
     * de la pasarela el día que la persona recargó—, así que entregarla en
     * billetes deja el cajón corto por algo que ese mostrador no cobró. Y
     * devolverla al saldo es instantáneo y no cuesta comisión.
     */
    @Transactional
    public Venta devolver(String ventaId, String usuarioNombre) {
        Venta v = paraResolver(ventaId);

        v.setEstado(Venta.EstadoVenta.ANULADO);
        v.setAnuladaAt(LocalDateTime.now());
        v.setResolucion(Venta.Resolucion.DEVUELTO);
        ventaRepository.save(v);
        asientoService.liberarAsiento(ventaId);

        if (sePagoConSaldo(v)) {
            // La referencia es la de ESTA venta: un cobro puede haber sido de
            // cuatro pasajes y acá se cancela uno. Y si alguien da dos clics,
            // la segunda vez no abona de nuevo.
            walletService.reintegrar(v.getClienteEmail(), v.getPrecio(),
                    "devolucion-venta:" + v.getId(),
                    "Devolución por el viaje cancelado " + v.getViajeCodigo());

            auditoriaService.registrar("DEVOLVER", "VENTAS", v.getId(),
                    "Devolución S/ " + v.getPrecio() + " al saldo de " + v.getClienteEmail()
                            + " por cancelación de " + v.getViajeCodigo()
                            + " (no sale de la caja: se había pagado con saldo)");
            return v;
        }

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
     * ¿Este pasaje se pagó con el saldo de una cuenta?
     *
     * <p>Hacen falta las dos cosas: el método y el correo. Sin correo no hay
     * saldo al que devolver, y entonces la devolución tiene que ser la normal
     * —en efectivo— antes que no devolver nada.
     */
    private boolean sePagoConSaldo(Venta v) {
        return "SALDO".equalsIgnoreCase(v.getMetodoPago())
                && v.getClienteEmail() != null && !v.getClienteEmail().isBlank();
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

        // Por el WalletService y con referencia, nunca a mano. Dos clics al mismo
        // botón entran los dos: `paraResolver` mira la venta con una lectura
        // corriente, y en REPEATABLE READ las dos transacciones ven el mismo
        // PENDIENTE. Lo único que frena el segundo abono es la referencia única
        // del movimiento — escribiéndolo a mano iba sin ella, y el monto se
        // acreditaba dos veces. Ver WalletService.abonar.
        walletService.abonar(
                email, v.getPrecio(),
                "saldo-favor-venta:" + v.getId(),
                "Saldo a favor por cancelación del viaje " + v.getViajeCodigo(),
                SaldoMovimiento.Tipo.SALDO_FAVOR,
                new WalletService.Detalle(v.getPasajeroDocumento(), v.getPasajeroNombre(),
                        v.getId(), usuarioNombre));

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

        // Sin esto el asiento del viaje nuevo nunca queda marcado como ocupado: el
        // manifiesto muestra bien al pasajero (lee directo de Venta), pero al vender
        // ese asiento aparecía libre porque nadie le avisaba a AsientoService del
        // cambio de viaje.
        asientoService.marcarVendido(
                destino.getId(),
                v.getAsientoNumero(),
                v.getId(),
                v.getPasajeroNombre(),
                v.getPasajeroDocumento(),
                v.getPasajeroTelefono(),
                v.getOrdenOrigen(),
                v.getOrdenDestino());

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

    // ───────────── Lo que puede hacer el propio cliente desde la web ─────────────

    /** Pasajes del cliente (por su correo) que quedaron por resolver. */
    public List<Venta> misPendientes(String email) {
        if (email == null || email.isBlank()) return List.of();
        return ventaRepository.findByResolucion(Venta.Resolucion.PENDIENTE).stream()
                .filter(v -> email.equalsIgnoreCase(v.getClienteEmail()))
                .collect(Collectors.toList());
    }

    /**
     * El cliente elige guardar su pasaje como saldo a favor. Se valida que el
     * pasaje sea suyo: sin esto, cualquiera con sesión podría tocar el de otro.
     */
    @Transactional
    public Venta clienteGuardaSaldo(String ventaId, String email) {
        verificarDueño(ventaId, email);
        return dejarSaldoAFavor(ventaId, "cliente:" + email);
    }

    /** El cliente elige otro viaje para su pasaje. */
    @Transactional
    public Venta clienteReprograma(String ventaId, String nuevoViajeId, String email) {
        verificarDueño(ventaId, email);
        return reprogramar(ventaId, nuevoViajeId, null, "cliente:" + email);
    }

    private void verificarDueño(String ventaId, String email) {
        Venta v = ventaRepository.findById(ventaId)
                .orElseThrow(() -> new RuntimeException("Pasaje no encontrado"));
        if (email == null || v.getClienteEmail() == null
                || !email.equalsIgnoreCase(v.getClienteEmail()))
            throw new RuntimeException("Ese pasaje no te pertenece");
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
