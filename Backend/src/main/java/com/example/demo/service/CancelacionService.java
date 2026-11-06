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
    private final IzipayService izipayService;

    public CancelacionService(ViajeRepository viajeRepository,
                              VentaRepository ventaRepository,
                              SaldoMovimientoRepository saldoRepository,
                              AsientoService asientoService,
                              CajaService cajaService,
                              AuditoriaService auditoriaService,
                              AlcanceSucursal alcance,
                              WalletService walletService,
                              IzipayService izipayService) {
        this.viajeRepository = viajeRepository;
        this.alcance = alcance;
        this.ventaRepository = ventaRepository;
        this.saldoRepository = saldoRepository;
        this.asientoService = asientoService;
        this.cajaService = cajaService;
        this.auditoriaService = auditoriaService;
        this.walletService = walletService;
        this.izipayService = izipayService;
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
     * <p>Hay <strong>tres</strong> caminos, según de dónde salió la plata:
     *
     * <ol>
     *   <li><strong>Pagado con saldo</strong> → vuelve al saldo. No sale nada
     *       de la caja: esa plata nunca entró al cajón, entró a la cuenta de la
     *       pasarela el día que la persona recargó. Entregarla en billetes deja
     *       el cajón corto por algo que ese mostrador no cobró.</li>
     *   <li><strong>Cobrado por Izipay</strong> → se le pide a Izipay que la
     *       devuelva, y tampoco sale de la caja. Antes esto era entrar al Back
     *       Office a mano mientras el sistema igual anotaba un egreso.</li>
     *   <li><strong>Todo lo demás</strong> (efectivo del mostrador, y también
     *       Yape de Mercado Pago, que todavía no tiene devolución automática)
     *       → como siempre: egreso en la caja.</li>
     * </ol>
     *
     * <p>El orden importa. La llamada a Izipay va <strong>al final</strong>, ya
     * con todo escrito: si falla, no hace falta deshacer nada porque la
     * transacción entera se va para atrás y el pasaje queda como estaba. Al
     * revés —devolver primero y anotar después— un fallo al guardar dejaría la
     * plata devuelta y el pasaje vivo.
     */
    @Transactional
    public Venta devolver(String ventaId, String usuarioNombre) {
        Venta v = paraResolver(ventaId);

        v.setEstado(Venta.EstadoVenta.ANULADO);
        v.setAnuladaAt(LocalDateTime.now());
        v.setResolucion(Venta.Resolucion.DEVUELTO);
        ventaRepository.save(v);
        asientoService.liberarAsiento(ventaId);

        if (loCobroIzipay(v)) {
            IzipayService.Devolucion d = izipayService.reembolsar(
                    v.getPasarelaReferencia(), aCentimos(v.getPrecio()),
                    "Devolucion " + v.getViajeCodigo() + " - venta " + v.getId());

            if (d.hecha) {
                auditoriaService.registrar("DEVOLVER", "VENTAS", v.getId(),
                        "Devolución S/ " + v.getPrecio() + " por Izipay (" + d.operacion + ")"
                                + (d.referencia != null ? " ref " + d.referencia : "")
                                + " por cancelación de " + v.getViajeCodigo()
                                + " — no sale de la caja: la cobró la pasarela");
                return v;
            }

            // Izipay no pudo. Se sigue por el camino de siempre —egreso con
            // método digital, que no toca el conteo de efectivo— y la auditoría
            // dice con todas las letras que falta hacerlo a mano, porque si no
            // nadie se entera hasta que el cliente reclama.
            registrarEgreso(v, usuarioNombre);
            auditoriaService.registrar("DEVOLVER", "VENTAS", v.getId(),
                    "Devolución S/ " + v.getPrecio() + " por cancelación de " + v.getViajeCodigo()
                            + " — PENDIENTE DE HACER A MANO EN EL BACK OFFICE DE IZIPAY: "
                            + d.motivo);
            return v;
        }

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

        registrarEgreso(v, usuarioNombre);

        auditoriaService.registrar("DEVOLVER", "VENTAS", v.getId(),
                "Devolución S/ " + v.getPrecio() + " a " + v.getPasajeroNombre()
                        + " por cancelación de " + v.getViajeCodigo());
        return v;
    }

    /** El egreso de toda la vida, con el método con el que pagó el pasajero. */
    private void registrarEgreso(Venta v, String usuarioNombre) {
        cajaService.registrarMovimientoAutomatico(usuarioNombre,
                MovimientoCaja.TipoMovimiento.EGRESO, v.getPrecio(),
                "Devolución por viaje cancelado " + v.getViajeCodigo()
                        + " — " + v.getPasajeroNombre(),
                v.getMetodoPago());
    }

    /**
     * ¿Esta venta la cobró Izipay, y por lo tanto se le puede pedir a Izipay
     * que la devuelva?
     *
     * <p>Se mira el <strong>procesador</strong>, no el método de pago. "TARJETA"
     * dice con qué pagó el pasajero, no quién cobró, y el día que haya dos
     * proveedores de tarjeta pedirle la devolución al equivocado es plata.
     * Las ventas viejas, de antes de que se guardara el procesador, tienen el
     * campo vacío y se van por el camino de siempre: devolverlas automáticamente
     * sin saber quién cobró sería adivinar.
     */
    private boolean loCobroIzipay(Venta v) {
        return ReservaService.PROC_IZIPAY.equalsIgnoreCase(v.getProcesador())
                && v.getPrecio() != null && v.getPrecio().signum() > 0;
    }

    /** Izipay cobra en céntimos; acá los montos son soles con dos decimales. */
    private static int aCentimos(BigDecimal soles) {
        return soles.movePointRight(2).setScale(0, java.math.RoundingMode.HALF_UP).intValueExact();
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
