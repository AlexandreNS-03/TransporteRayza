package com.example.demo.service;

import com.example.demo.dto.MovimientoWalletDTO;
import com.example.demo.dto.WalletDTO;
import com.example.demo.model.Cliente;
import com.example.demo.model.RecargaWallet;
import com.example.demo.model.SaldoMovimiento;
import com.example.demo.model.SaldoMovimiento.Tipo;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.repository.RecargaWalletRepository;
import com.example.demo.repository.SaldoMovimientoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Rayza Wallet: plata que el cliente deja guardada y después gasta en pasajes.
 *
 * <h3>Lo que la wallet NO hace, y por qué</h3>
 *
 * <p><strong>No se retira.</strong> Devolver el saldo en efectivo se parece
 * demasiado a emitir dinero electrónico, que en Perú regula la SBS (Ley 29985) y
 * está reservado a emisores autorizados. Un crédito que solo se gasta en nuestros
 * propios pasajes es una venta anticipada, que es terreno conocido. Si alguna vez
 * hace falta devolver plata, se devuelve a mano por el mismo medio con que pagó,
 * como cualquier devolución.
 *
 * <p><strong>No vence.</strong> Hacer que caduque es quedarse con plata del
 * cliente: es la clase de cosa que termina en Indecopi y, peor, en que nadie
 * vuelva a cargar saldo. Por eso tampoco hay "montos por vencer" que mostrar.
 *
 * <h3>Cómo está construida</h3>
 *
 * <p><strong>El saldo no se guarda: se suma.</strong> No existe una columna
 * "saldo" que alguien pueda dejar mal; existe el libro de {@link SaldoMovimiento}
 * y el saldo es su suma. Si algo no cuadra, se ve de dónde salió cada sol.
 *
 * <p><strong>Cada movimiento lleva una referencia única.</strong> Si el navegador
 * reintenta, o el IPN de Izipay llega además de la vuelta del navegador, llega la
 * misma referencia y no se cuenta dos veces. Con plata, "lo intenté dos veces" no
 * puede terminar en dos movimientos.
 *
 * <p><strong>Gastar bloquea al cliente mientras tanto.</strong> Dos compras a la
 * vez verían los mismos S/ 50 y las dos creerían que alcanza.
 *
 * <p><strong>Recargar compara contra lo que se esperaba cobrar.</strong> La
 * recarga se anota antes de mandar a pagar; al volver se compara el monto que
 * firmó Izipay contra el anotado. Sin eso se paga S/ 1 y se pide acreditar
 * S/ 1000.
 */
@Service
public class WalletService {

    /** Lo mínimo que tiene sentido recargar. */
    public static final BigDecimal RECARGA_MINIMA = new BigDecimal("20.00");

    /** Tope por recarga. No es un límite técnico: es no volverse un banco sin querer. */
    public static final BigDecimal RECARGA_MAXIMA = new BigDecimal("2000.00");

    /** Techo del saldo acumulado. Mismo motivo que el tope por recarga. */
    public static final BigDecimal SALDO_MAXIMO = new BigDecimal("3000.00");

    /** Prefijo del orderId. Lo usa el IPN para saber que el pedido es una recarga. */
    public static final String PREFIJO_ORDEN = "WAL-";

    private static final List<String> CONDICIONES = List.of(
            "El saldo no vence.",
            "Solo se puede usar para pagar en Transportes Rayza.",
            "No se devuelve en efectivo ni se transfiere a otra cuenta.");

    private final SaldoMovimientoRepository movimientos;
    private final RecargaWalletRepository recargas;
    private final ClienteRepository clientes;
    private final IzipayService izipayService;
    private final AuditoriaService auditoriaService;

    @Value("${wallet.enabled:false}")
    private boolean habilitada;

    public WalletService(SaldoMovimientoRepository movimientos,
                         RecargaWalletRepository recargas,
                         ClienteRepository clientes,
                         IzipayService izipayService,
                         AuditoriaService auditoriaService) {
        this.movimientos = movimientos;
        this.recargas = recargas;
        this.clientes = clientes;
        this.izipayService = izipayService;
        this.auditoriaService = auditoriaService;
    }

    public boolean estaHabilitada() { return habilitada; }

    /* ──────────────── Consultar ──────────────── */

    public BigDecimal saldoDe(String email) {
        BigDecimal s = movimientos.saldoDe(normalizar(email));
        return s != null ? s : BigDecimal.ZERO;
    }

    /**
     * Lo que ve la pantalla de la cuenta.
     *
     * <p>Los movimientos se listan aunque la wallet esté apagada: el saldo a
     * favor de una cancelación existe desde antes que la wallet, y esconderlo
     * sería esconderle plata suya.
     */
    public WalletDTO resumen(String email) {
        WalletDTO dto = new WalletDTO();
        dto.setHabilitada(habilitada);
        dto.setSaldo(saldoDe(email));
        dto.setRecargaMinima(RECARGA_MINIMA);
        dto.setRecargaMaxima(RECARGA_MAXIMA);
        dto.setCondiciones(CONDICIONES);
        dto.setMovimientos(
                movimientos.findByClienteEmailIgnoreCaseOrderByCreatedAtDesc(normalizar(email))
                        .stream().map(WalletService::toDTO).toList());
        return dto;
    }

    /** ¿Le alcanza para pagar esto? Sin bloquear: sirve para mostrar, no para cobrar. */
    public boolean leAlcanza(String email, BigDecimal monto) {
        if (!habilitada || monto == null) return false;
        return saldoDe(email).compareTo(monto) >= 0;
    }

    /* ──────────────── Mover plata ──────────────── */

    /**
     * Suma plata al saldo.
     *
     * <p>Se llama cuando un pago quedó confirmado de verdad, nunca porque el
     * navegador lo diga. La referencia es la de la pasarela: si llega repetida,
     * no se acredita de nuevo.
     */
    @Transactional
    public SaldoMovimiento abonar(String email, BigDecimal monto, String referencia,
                                  String motivo, Tipo tipo) {
        if (monto == null || monto.signum() <= 0)
            throw new RuntimeException("El monto a abonar tiene que ser mayor que cero");

        Optional<SaldoMovimiento> yaEsta = movimientos.findByReferencia(referencia);
        if (yaEsta.isPresent()) return yaEsta.get();   // reintento: no se cuenta dos veces

        SaldoMovimiento m = nuevo(email, monto, motivo, tipo, referencia);
        try {
            movimientos.saveAndFlush(m);
        } catch (DataIntegrityViolationException e) {
            // Dos avisos del mismo pago entraron a la vez: ganó el otro, y está bien.
            return movimientos.findByReferencia(referencia).orElseThrow(() -> e);
        }

        auditoriaService.registrar("WALLET_ABONO", "PAGOS", m.getId(),
                "Se abonó S/ " + monto + " al saldo de " + normalizar(email) + " (" + motivo + ")");
        return m;
    }

    /**
     * Descuenta plata del saldo para pagar algo.
     *
     * <p>Serializado por cliente: sin el bloqueo, dos compras simultáneas leen el
     * mismo saldo y las dos creen que alcanza. El resultado sería un saldo
     * negativo, o sea un pasaje regalado.
     *
     * <p>Nunca deja el saldo por debajo de cero. Si no alcanza, no se cobra nada:
     * no hay pagos a medias.
     */
    @Transactional
    public SaldoMovimiento consumir(String email, BigDecimal monto, String referencia, String motivo) {
        if (!habilitada)
            throw new RuntimeException("Pagar con el saldo todavía no está disponible");
        if (monto == null || monto.signum() <= 0)
            throw new RuntimeException("El monto a cobrar tiene que ser mayor que cero");

        String limpio = normalizar(email);

        // Atajo para el reintento tranquilo: si ya está cobrado, no hace falta tomar
        // ningún candado. La comprobación que de verdad vale es la de más abajo,
        // sobre las filas bloqueadas.
        Optional<SaldoMovimiento> yaEsta = movimientos.findByReferencia(referencia);
        if (yaEsta.isPresent()) return yaEsta.get();

        // Mientras dure esta transacción, nadie más gasta el saldo de este cliente.
        clientes.bloquearPorEmail(limpio)
                .orElseThrow(() -> new RuntimeException("Cuenta no encontrada"));

        // El saldo se lee CON candado, no con saldoDe(). En REPEATABLE READ una
        // lectura corriente devuelve la foto que la transacción sacó en su primera
        // consulta —antes de tomar el candado—, y así dos pagos simultáneos veían
        // los mismos S/ 90 y los gastaban los dos. Comprobado: el saldo quedó en
        // −90. Ver bloquearMovimientosDe.
        List<SaldoMovimiento> suyos = movimientos.bloquearMovimientosDe(limpio);

        // La referencia se vuelve a buscar acá, sobre las filas recién bloqueadas:
        // el atajo de arriba mira esa misma foto vieja, así que dos intentos del
        // mismo cobro a la vez lo pasaban los dos y el segundo moría contra el
        // índice único con un error feo.
        Optional<SaldoMovimiento> repetido = suyos.stream()
                .filter(m -> referencia.equals(m.getReferencia())).findFirst();
        if (repetido.isPresent()) return repetido.get();

        BigDecimal saldo = suyos.stream().map(SaldoMovimiento::getMonto)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (saldo.compareTo(monto) < 0)
            throw new RuntimeException("Te falta saldo: tienes S/ " + saldo
                    + " y esto cuesta S/ " + monto);

        SaldoMovimiento m = nuevo(limpio, monto.negate(), motivo, Tipo.CONSUMO, referencia);
        movimientos.save(m);

        auditoriaService.registrar("WALLET_CONSUMO", "PAGOS", m.getId(),
                "Se cobró S/ " + monto + " del saldo de " + limpio + " (" + motivo + ")");
        return m;
    }

    /**
     * Devuelve al saldo lo que se había cobrado del saldo.
     *
     * <p>Si la compra se cae después de descontar —falla la emisión, el asiento se
     * perdió—, la plata tiene que volver. La referencia nueva se deriva de la
     * original para que tampoco se devuelva dos veces.
     */
    @Transactional
    public void devolver(String referenciaDelCobro, String motivo) {
        SaldoMovimiento cobro = movimientos.findByReferencia(referenciaDelCobro).orElse(null);
        if (cobro == null || cobro.getMonto().signum() >= 0) return;

        abonar(cobro.getClienteEmail(), cobro.getMonto().negate(),
                "devolucion:" + referenciaDelCobro, motivo, Tipo.AJUSTE);
    }

    /* ──────────────── Recargar ──────────────── */

    /**
     * Primer paso de una recarga: anota cuánto se va a cobrar y pide el
     * formulario de Izipay.
     *
     * <p>El monto se anota <em>antes</em> de mandar a pagar. Esa fila es lo único
     * que después permite saber si lo que se pagó es lo que se pidió.
     */
    @Transactional
    public RecargaIniciada iniciarRecarga(String email, BigDecimal monto) {
        if (!habilitada) throw new RuntimeException("Recargar saldo todavía no está disponible");

        Cliente c = clientes.findByEmail(normalizar(email))
                .orElseThrow(() -> new RuntimeException("Cuenta no encontrada"));

        // Céntimos y nada más fino: Izipay cobra en céntimos, y un S/ 20.004
        // redondeado por nosotros es una diferencia que después nadie explica.
        if (monto != null && monto.stripTrailingZeros().scale() > 2)
            throw new RuntimeException("El monto va con dos decimales como máximo");

        BigDecimal pedido = monto == null ? null : monto.setScale(2, java.math.RoundingMode.HALF_UP);
        if (pedido == null || pedido.compareTo(RECARGA_MINIMA) < 0)
            throw new RuntimeException("La recarga mínima es S/ " + RECARGA_MINIMA);
        if (pedido.compareTo(RECARGA_MAXIMA) > 0)
            throw new RuntimeException("La recarga máxima es S/ " + RECARGA_MAXIMA);

        BigDecimal saldo = saldoDe(c.getEmail());
        if (saldo.add(pedido).compareTo(SALDO_MAXIMO) > 0)
            throw new RuntimeException("Con esta recarga pasarías el máximo de S/ " + SALDO_MAXIMO
                    + " de saldo. Ahora tienes S/ " + saldo + ".");

        RecargaWallet r = new RecargaWallet();
        r.setId(PREFIJO_ORDEN + UUID.randomUUID().toString().substring(0, 18).toUpperCase());
        r.setClienteEmail(c.getEmail());
        r.setMonto(pedido);
        r.setEstado(RecargaWallet.Estado.PENDIENTE);
        r.setCreatedAt(LocalDateTime.now());
        recargas.saveAndFlush(r);

        int cents = pedido.multiply(BigDecimal.valueOf(100)).intValueExact();
        IzipayService.Formulario f = izipayService.crearFormulario(
                r.getId(), cents, c.getEmail(),
                (c.getNombres() + " " + (c.getApellidos() == null ? "" : c.getApellidos())).trim(),
                c.getNumeroDocumento(), c.celularCompleto());

        return new RecargaIniciada(r.getId(), pedido, f);
    }

    /** Lo que necesita el navegador para cobrar la recarga. */
    public record RecargaIniciada(String recargaId, BigDecimal monto,
                                  IzipayService.Formulario formulario) { }

    /**
     * Segundo paso: el navegador vuelve del formulario y dice que pagó.
     *
     * <p>Decirlo no alcanza. Se valida la firma, y además se comprueba que el
     * pedido que Izipay firmó sea <em>esta</em> recarga y que el monto cobrado sea
     * el que quedó anotado. Sin esas dos comparaciones, una respuesta legítima de
     * un pago de S/ 20 serviría para acreditar una recarga de S/ 2000.
     */
    @Transactional
    public WalletDTO confirmarRecarga(String email, String recargaId,
                                      String krAnswer, String krHash) {
        if (!habilitada) throw new RuntimeException("Recargar saldo todavía no está disponible");

        RecargaWallet r = recargas.findByIdAndClienteEmailIgnoreCase(recargaId, normalizar(email))
                .orElseThrow(() -> new RuntimeException("No encontramos esa recarga"));

        if (r.getEstado() == RecargaWallet.Estado.PAGADA) return resumen(email);  // ya se acreditó

        IzipayService.Resultado pago = izipayService.verificarPago(krAnswer, krHash);
        if (!pago.pagado) {
            r.setEstado(RecargaWallet.Estado.FALLIDA);
            r.setMotivoFalla(pago.motivo);
            recargas.save(r);
            throw new RuntimeException(pago.motivo != null ? pago.motivo
                    : "El pago no se pudo confirmar");
        }

        acreditar(r, pago, "recarga desde la cuenta");
        return resumen(email);
    }

    /**
     * Acredita una recarga avisada por el IPN de Izipay (servidor a servidor).
     *
     * <p>Es el camino confiable: el navegador puede cerrarse después de pagar y
     * entonces nadie llama al confirmar. Los dos caminos terminan en el mismo
     * {@link #abonar}, con la misma referencia, así que el que llegue segundo no
     * duplica nada.
     */
    @Transactional
    public String acreditarDesdeIpn(String orderId, IzipayService.Resultado pago) {
        RecargaWallet r = recargas.findById(orderId).orElse(null);
        if (r == null) return "Recarga no encontrada: " + orderId;
        if (r.getEstado() == RecargaWallet.Estado.PAGADA) return "Ya estaba acreditada";

        acreditar(r, pago, "recarga confirmada por Izipay");
        return "Recarga acreditada";
    }

    /**
     * El único lugar donde una recarga se vuelve saldo.
     *
     * <p>Las dos comprobaciones de acá son lo que separa una recarga de un regalo:
     * que el pedido sea este y que el monto sea el pactado. En modo simulación no
     * hay monto que comparar porque no hubo cobro — ahí se cree lo anotado, que es
     * lo que pidió el propio cliente.
     */
    private void acreditar(RecargaWallet r, IzipayService.Resultado pago, String motivo) {
        if (!pago.simulado) {
            if (pago.orderId != null && !pago.orderId.equals(r.getId())) {
                rechazar(r, "El pago corresponde a otro pedido (" + pago.orderId + ")");
                throw new RuntimeException("Ese pago no corresponde a esta recarga");
            }
            int esperado = r.getMonto().multiply(BigDecimal.valueOf(100)).intValueExact();
            if (pago.montoCents == null || pago.montoCents != esperado) {
                rechazar(r, "Se cobró " + pago.montoCents + " céntimos y se esperaban " + esperado);
                throw new RuntimeException(
                        "El monto pagado no coincide con la recarga. No acreditamos nada; "
                        + "escríbenos y lo revisamos.");
            }
        }

        // La referencia es el id de la recarga, no el de la transacción: el IPN y
        // la vuelta del navegador traen uuids distintos del mismo pago, y con el
        // uuid como llave la plata entraría dos veces.
        abonar(r.getClienteEmail(), r.getMonto(), "recarga:" + r.getId(), motivo, Tipo.ABONO);

        r.setEstado(RecargaWallet.Estado.PAGADA);
        r.setReferenciaPasarela(pago.referencia);
        r.setPagadaAt(LocalDateTime.now());
        recargas.save(r);
    }

    private void rechazar(RecargaWallet r, String porque) {
        r.setEstado(RecargaWallet.Estado.FALLIDA);
        r.setMotivoFalla(porque);
        recargas.save(r);
        auditoriaService.registrar("WALLET_RECARGA_RECHAZADA", "PAGOS", r.getId(),
                "Recarga de " + r.getClienteEmail() + " rechazada: " + porque);
    }

    /* ──────────────── Interno ──────────────── */

    private SaldoMovimiento nuevo(String email, BigDecimal monto, String motivo,
                                  Tipo tipo, String referencia) {
        SaldoMovimiento m = new SaldoMovimiento();
        m.setId(UUID.randomUUID().toString());
        m.setClienteEmail(normalizar(email));
        m.setMonto(monto);
        m.setMotivo(motivo);
        m.setTipo(tipo);
        m.setReferencia(referencia);
        m.setCreatedAt(LocalDateTime.now());
        return m;
    }

    private static MovimientoWalletDTO toDTO(SaldoMovimiento m) {
        MovimientoWalletDTO d = new MovimientoWalletDTO();
        d.setId(m.getId());
        d.setTipo(m.getTipo() != null ? m.getTipo().name() : Tipo.SALDO_FAVOR.name());
        d.setMonto(m.getMonto());
        d.setMotivo(m.getMotivo());
        d.setFecha(m.getCreatedAt() != null ? m.getCreatedAt().toString() : null);
        return d;
    }

    private static String normalizar(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
