package com.example.demo.service;

import com.example.demo.dto.CajaRequest;
import com.example.demo.model.Caja;
import com.example.demo.model.MovimientoCaja;
import com.example.demo.model.Usuario;
import com.example.demo.repository.CajaRepository;
import com.example.demo.repository.MovimientoCajaRepository;
import com.example.demo.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Service
public class CajaService {

    private final CajaRepository cajaRepository;
    private final MovimientoCajaRepository movimientoRepository;
    private final UsuarioRepository usuarioRepository;
    private final AuditoriaService auditoriaService;

    public CajaService(CajaRepository cajaRepository,
                       MovimientoCajaRepository movimientoRepository,
                       UsuarioRepository usuarioRepository,
                       AuditoriaService auditoriaService) {
        this.cajaRepository       = cajaRepository;
        this.movimientoRepository = movimientoRepository;
        this.usuarioRepository    = usuarioRepository;
        this.auditoriaService     = auditoriaService;
    }

    public List<Caja> listar() {
        return cajaRepository.findAllByOrderByCreatedAtDesc();
    }

    public Caja miCajaAbierta(String usuarioNombre) {
        return cajaRepository.findByUsuarioNombreAndEstado(usuarioNombre, Caja.EstadoCaja.ABIERTA)
                .orElse(null);
    }

    public List<MovimientoCaja> movimientos(String cajaId) {
        return movimientoRepository.findByCajaIdOrderByCreatedAtDesc(cajaId);
    }

    @Transactional
    public Caja abrir(CajaRequest req, String usuarioNombre) {
        if (miCajaAbierta(usuarioNombre) != null)
            throw new RuntimeException("Ya tienes una caja abierta. Ciérrala antes de abrir otra.");

        if (req.getMontoInicial() == null || req.getMontoInicial().signum() < 0)
            throw new RuntimeException("El monto inicial es obligatorio y no puede ser negativo");

        Usuario usuario = usuarioRepository.findByUsername(usuarioNombre).orElse(null);

        Caja caja = new Caja();
        caja.setId(UUID.randomUUID().toString());
        caja.setUsuarioNombre(usuarioNombre);
        if (usuario != null) {
            caja.setUsuarioId(usuario.getId());
            caja.setUsuarioRol(usuario.getRol() != null ? usuario.getRol().name() : null);
            caja.setSucursalId(usuario.getSucursalId());
            caja.setSucursalNombre(usuario.getSucursalNombre());
        }
        caja.setFechaApertura(LocalDate.now());
        caja.setHoraApertura(LocalTime.now().withNano(0));
        caja.setMontoInicial(req.getMontoInicial());
        caja.setEstado(Caja.EstadoCaja.ABIERTA);
        caja.setObservacionApertura(req.getObservacion());
        caja.setCreatedAt(LocalDateTime.now());
        Caja abierta = cajaRepository.save(caja);

        auditoriaService.registrar("ABRIR", "CAJA", abierta.getId(),
                "Caja abierta con S/ " + abierta.getMontoInicial());
        return abierta;
    }

    @Transactional
    public Caja cerrar(String cajaId, CajaRequest req, String usuarioNombre) {
        Caja caja = cajaRepository.findById(cajaId)
                .orElseThrow(() -> new RuntimeException("Caja no encontrada"));

        if (caja.getEstado() == Caja.EstadoCaja.CERRADA)
            throw new RuntimeException("La caja ya está cerrada");

        if (!caja.getUsuarioNombre().equals(usuarioNombre))
            throw new RuntimeException("Solo el usuario que abrió la caja puede cerrarla");

        if (req.getMontoCierre() == null || req.getMontoCierre().signum() < 0)
            throw new RuntimeException("El monto de cierre (efectivo contado) es obligatorio");

        List<MovimientoCaja> movs = movimientoRepository.findByCajaIdOrderByCreatedAtDesc(cajaId);

        BigDecimal ingresos = BigDecimal.ZERO;
        BigDecimal egresos  = BigDecimal.ZERO;
        BigDecimal ventas   = BigDecimal.ZERO;
        BigDecimal anulaciones = BigDecimal.ZERO;
        for (MovimientoCaja m : movs) {
            if (m.getTipo() == MovimientoCaja.TipoMovimiento.INGRESO) {
                ingresos = ingresos.add(m.getMonto());
                if (m.getMotivo() != null && m.getMotivo().startsWith("Venta")) ventas = ventas.add(m.getMonto());
            } else {
                egresos = egresos.add(m.getMonto());
                if (m.getMotivo() != null && m.getMotivo().startsWith("Anulación")) anulaciones = anulaciones.add(m.getMonto());
            }
        }

        BigDecimal neto = caja.getMontoInicial().add(ingresos).subtract(egresos);

        caja.setTotalVentas(ventas);
        caja.setTotalAnulaciones(anulaciones);
        caja.setTotalNeto(neto);
        caja.setMontoCierre(req.getMontoCierre());
        caja.setDiferencia(req.getMontoCierre().subtract(neto));
        caja.setObservacionCierre(req.getObservacion());
        caja.setEstado(Caja.EstadoCaja.CERRADA);
        caja.setCerradaAt(LocalDateTime.now());
        Caja cerrada = cajaRepository.save(caja);

        auditoriaService.registrar("CERRAR", "CAJA", cerrada.getId(),
                "Neto esperado S/ " + cerrada.getTotalNeto() + ", contado S/ " + cerrada.getMontoCierre()
                        + ", diferencia S/ " + cerrada.getDiferencia());
        return cerrada;
    }

    /** Movimiento manual (ingreso/egreso) sobre la caja abierta del usuario. */
    @Transactional
    public MovimientoCaja registrarMovimientoManual(CajaRequest req, String usuarioNombre) {
        Caja caja = miCajaAbierta(usuarioNombre);
        if (caja == null)
            throw new RuntimeException("No tienes una caja abierta");

        if (req.getMonto() == null || req.getMonto().signum() <= 0)
            throw new RuntimeException("El monto debe ser mayor a cero");
        if (req.getMotivo() == null || req.getMotivo().isBlank())
            throw new RuntimeException("El motivo es obligatorio");

        MovimientoCaja.TipoMovimiento tipo;
        try { tipo = MovimientoCaja.TipoMovimiento.valueOf(req.getTipo()); }
        catch (Exception e) { throw new RuntimeException("Tipo de movimiento inválido (INGRESO o EGRESO)"); }

        return guardarMovimiento(caja, tipo, req.getMonto(), req.getMotivo().trim(), req.getObservacion(), usuarioNombre);
    }

    /**
     * Registro automático desde ventas/anulaciones/gastos. Best-effort:
     * si el usuario no tiene caja abierta no se registra nada (no bloquea la operación).
     */
    @Transactional
    public void registrarMovimientoAutomatico(String usuarioNombre,
                                              MovimientoCaja.TipoMovimiento tipo,
                                              BigDecimal monto, String motivo) {
        Caja caja = miCajaAbierta(usuarioNombre);
        if (caja == null || monto == null) return;
        guardarMovimiento(caja, tipo, monto, motivo, null, usuarioNombre);
    }

    private MovimientoCaja guardarMovimiento(Caja caja, MovimientoCaja.TipoMovimiento tipo,
                                             BigDecimal monto, String motivo,
                                             String observacion, String usuarioNombre) {
        MovimientoCaja m = new MovimientoCaja();
        m.setId(UUID.randomUUID().toString());
        m.setCajaId(caja.getId());
        m.setTipo(tipo);
        m.setMonto(monto);
        m.setMotivo(motivo);
        m.setObservacion(observacion);
        m.setUsuarioId(caja.getUsuarioId());
        m.setUsuarioNombre(usuarioNombre);
        m.setSucursalId(caja.getSucursalId());
        m.setSucursalNombre(caja.getSucursalNombre());
        m.setFecha(LocalDate.now());
        m.setHora(LocalTime.now().withNano(0));
        m.setCreatedAt(LocalDateTime.now());
        return movimientoRepository.save(m);
    }
}
