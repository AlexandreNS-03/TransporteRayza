package com.example.demo.service;

import com.example.demo.dto.VentaDTO;
import com.example.demo.dto.VentaEditRequest;
import com.example.demo.dto.VentaRequest;
import com.example.demo.model.*;
import com.example.demo.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class VentaService {

    private final VentaRepository ventaRepository;
    private final VentaTramoUsadoRepository tramoUsadoRepository;
    private final ViajeRepository viajeRepository;
    private final UsuarioRepository usuarioRepository;
    private final AsientoService asientoService;
    private final EmailService emailService;
    private final CajaService cajaService;
    private final AuditoriaService auditoriaService;

    public VentaDTO embarcarPasajero(String id, String usuarioNombre) {
        Venta venta = ventaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));

        if (venta.getEstado() == Venta.EstadoVenta.ANULADO)
            throw new RuntimeException("La venta está anulada");

        if (venta.getEmbarqueEstado() == Venta.EmbarqueEstado.EMBARCADO)
            throw new RuntimeException("El pasajero ya embarcó");

        validarVentanaDeEmbarque(venta);

        venta.setEmbarqueEstado(Venta.EmbarqueEstado.EMBARCADO);
        venta.setEmbarcadoAt(LocalDateTime.now());
        venta.setEmbarcadoPor(usuarioNombre);

        Venta guardada = ventaRepository.save(venta);

        // Correo de confirmación al pasajero (si registró email) — no bloquea el embarque si falla
        if (guardada.getClienteEmail() != null && !guardada.getClienteEmail().isBlank()) {
            try {
                emailService.enviarConfirmacionEmbarque(
                        guardada.getClienteEmail(),
                        guardada.getPasajeroNombre(),
                        guardada.getViajeDescripcion(),
                        guardada.getAsientoTipo() + " #" + guardada.getAsientoNumero(),
                        guardada.getEmbarcadoAt().toString()
                );
            } catch (Exception e) {
                System.err.println("Error enviando correo de embarque: " + e.getMessage());
            }
        }

        return toDTO(guardada);
    }

    /**
     * El embarque solo está permitido desde 2 horas antes de la salida
     * hasta 20 minutos después de la hora programada del viaje.
     */
    private void validarVentanaDeEmbarque(Venta venta) {
        if (venta.getViajeId() == null) return;
        Viaje viaje = viajeRepository.findById(venta.getViajeId()).orElse(null);
        if (viaje == null || viaje.getFechaSalida() == null || viaje.getHoraSalida() == null) return;

        LocalDateTime salida = LocalDateTime.of(viaje.getFechaSalida(), viaje.getHoraSalida());
        LocalDateTime inicio = salida.minusHours(2);
        LocalDateTime fin    = salida.plusMinutes(20);
        LocalDateTime ahora  = LocalDateTime.now();

        java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        if (ahora.isBefore(inicio))
            throw new RuntimeException("El embarque aún no está habilitado. Se abre el " + inicio.format(fmt)
                    + " (2 horas antes de la salida programada: " + salida.format(fmt) + ")");
        if (ahora.isAfter(fin))
            throw new RuntimeException("El embarque ya cerró el " + fin.format(fmt)
                    + " (20 minutos después de la salida programada: " + salida.format(fmt) + ")");
    }

    public List<VentaDTO> listarMisEmbarquesHoy(String usuarioNombre) {
        LocalDate hoy = LocalDate.now();
        return ventaRepository.findAll().stream()
                .filter(v -> v.getEmbarqueEstado() == Venta.EmbarqueEstado.EMBARCADO)
                .filter(v -> usuarioNombre.equals(v.getEmbarcadoPor()))
                .filter(v -> v.getEmbarcadoAt() != null && v.getEmbarcadoAt().toLocalDate().isEqual(hoy))
                .sorted((a, b) -> b.getEmbarcadoAt().compareTo(a.getEmbarcadoAt()))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // Listar todas
    public List<VentaDTO> listarVentas() {
        return ventaRepository.findAllByOrderByFechaVentaDesc()
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // Listar por viaje
    public List<VentaDTO> listarPorViaje(String viajeId) {
        return ventaRepository.findByViajeId(viajeId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // Buscar por QR
    public VentaDTO buscarPorQr(String codigoQr) {
        return ventaRepository.findByCodigoQr(codigoQr)
                .map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));
    }

    // Buscar por documento
    public List<VentaDTO> buscarPorDocumento(String documento) {
        return ventaRepository.findByPasajeroDocumento(documento)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // Ver detalle
    public VentaDTO obtenerDetalle(String id) {
        return ventaRepository.findById(id)
                .map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));
    }

    // Crear venta
    @Transactional
    public VentaDTO crearVenta(VentaRequest req, String usuarioNombre) {
        Viaje viaje = viajeRepository.findById(req.getViajeId())
                .orElseThrow(() -> new RuntimeException("Viaje no encontrado"));

        // Venta por sucursal: cada sucursal solo vende los viajes que salen de ella
        // (el ADMIN y los usuarios sin sucursal asignada pueden vender cualquier viaje)
        Usuario vendedor = usuarioRepository.findByUsername(usuarioNombre).orElse(null);
        if (vendedor != null
                && vendedor.getRol() != Rol.ADMIN
                && vendedor.getSucursalId() != null
                && !vendedor.getSucursalId().equals(viaje.getSucursalId())) {
            throw new RuntimeException("Solo puedes vender viajes de tu sucursal ("
                    + vendedor.getSucursalNombre() + "). Este viaje pertenece a "
                    + viaje.getSucursalNombre());
        }

        Venta venta = new Venta();
        venta.setId(UUID.randomUUID().toString());
        venta.setViajeId(viaje.getId());
        venta.setViajeCodigo(viaje.getCodigoViaje());
        venta.setViajeDescripcion(viaje.getRutaNombre());
        venta.setTipoDocumento(Venta.TipoDocumento.valueOf(req.getTipoDocumento()));
        venta.setPasajeroNombre(req.getPasajeroNombre());
        venta.setPasajeroDocumento(req.getPasajeroDocumento());
        venta.setProcedencia(req.getProcedencia());
        venta.setPasajeroTelefono(req.getPasajeroTelefono());
        venta.setClienteEmail(req.getClienteEmail());
        venta.setEdad(req.getEdad());
        if (req.getSexo() != null)
            venta.setSexo(Venta.Sexo.valueOf(req.getSexo()));
        venta.setObservacion(req.getObservacion());
        venta.setTipoComprobante(Venta.TipoComprobante.valueOf(req.getTipoComprobante()));
        venta.setSerieComprobante("T001");
        venta.setNumeroComprobante(generarNumeroComprobante());
        venta.setClienteNombre(req.getClienteNombre());
        venta.setClienteTipoDoc(req.getClienteTipoDoc());
        venta.setClienteDocumento(req.getClienteDocumento());
        venta.setDetalleComprobante(req.getDetalleComprobante());
        venta.setAsientoNumero(req.getAsientoNumero());
        venta.setAsientoTipo(Venta.AsientoTipo.valueOf(req.getAsientoTipo()));
        venta.setParadaOrigen(req.getParadaOrigen());
        venta.setParadaDestino(req.getParadaDestino());
        venta.setOrdenOrigen(req.getOrdenOrigen());
        venta.setOrdenDestino(req.getOrdenDestino());
        venta.setPrecio(req.getPrecio());
        venta.setCodigoQr(UUID.randomUUID().toString());
        venta.setEmbarqueEstado(Venta.EmbarqueEstado.PENDIENTE);
        venta.setEstado(Venta.EstadoVenta.PAGADO);
        venta.setFechaVenta(LocalDate.now());
        venta.setUsuarioNombre(usuarioNombre);
        venta.setCreatedAt(LocalDateTime.now());
        ventaRepository.save(venta);

        // Registrar tramos usados
        guardarTramosUsados(venta, req.getOrdenOrigen(), req.getOrdenDestino());

        // Marcar asiento como vendido
        asientoService.marcarVendido(
                viaje.getId(),
                req.getAsientoNumero(),
                venta.getId(),
                req.getPasajeroNombre(),
                req.getPasajeroDocumento(),
                req.getPasajeroTelefono(),
                req.getOrdenOrigen(),
                req.getOrdenDestino()
        );

        // Ingreso en la caja abierta del vendedor (si tiene una)
        cajaService.registrarMovimientoAutomatico(usuarioNombre,
                MovimientoCaja.TipoMovimiento.INGRESO,
                venta.getPrecio(),
                "Venta pasaje " + venta.getSerieComprobante() + "-" + venta.getNumeroComprobante()
                        + " — " + venta.getPasajeroNombre());

        auditoriaService.registrar("CREAR", "VENTAS", venta.getId(),
                "Venta " + venta.getSerieComprobante() + "-" + venta.getNumeroComprobante()
                        + " a " + venta.getPasajeroNombre() + " (S/ " + venta.getPrecio()
                        + ", asiento " + venta.getAsientoTipo() + " #" + venta.getAsientoNumero() + ")");

        return toDTO(venta);
    }

    // Editar datos del pasajero / comprobante de una venta (no toca asiento, tramo ni precio)
    @Transactional
    public VentaDTO editarVenta(String id, VentaEditRequest req, String usuarioNombre) {
        Venta venta = ventaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));

        if (venta.getEstado() == Venta.EstadoVenta.ANULADO)
            throw new RuntimeException("No se puede editar una venta anulada");

        if (req.getPasajeroNombre() == null || req.getPasajeroNombre().isBlank())
            throw new RuntimeException("El nombre del pasajero es obligatorio");
        if (req.getPasajeroDocumento() == null || req.getPasajeroDocumento().isBlank())
            throw new RuntimeException("El documento del pasajero es obligatorio");

        if (req.getTipoDocumento() != null)
            venta.setTipoDocumento(Venta.TipoDocumento.valueOf(req.getTipoDocumento()));
        venta.setPasajeroNombre(req.getPasajeroNombre().trim());
        venta.setPasajeroDocumento(req.getPasajeroDocumento().trim());
        venta.setProcedencia(req.getProcedencia());
        venta.setPasajeroTelefono(req.getPasajeroTelefono());
        venta.setClienteEmail(req.getClienteEmail());
        venta.setEdad(req.getEdad());
        if (req.getSexo() != null && !req.getSexo().isBlank())
            venta.setSexo(Venta.Sexo.valueOf(req.getSexo()));
        venta.setClienteNombre(req.getClienteNombre());
        venta.setClienteTipoDoc(req.getClienteTipoDoc());
        venta.setClienteDocumento(req.getClienteDocumento());
        venta.setDetalleComprobante(req.getDetalleComprobante());
        ventaRepository.save(venta);

        // Mantener sincronizados los datos del pasajero en el mapa de asientos
        asientoService.actualizarDatosPasajero(id,
                req.getPasajeroNombre().trim(), req.getPasajeroDocumento().trim(), req.getPasajeroTelefono());

        auditoriaService.registrar("EDITAR", "VENTAS", venta.getId(),
                "Venta " + venta.getSerieComprobante() + "-" + venta.getNumeroComprobante()
                        + ", pasajero: " + venta.getPasajeroNombre());

        return toDTO(venta);
    }

    // Anular venta
    @Transactional
    public VentaDTO anularVenta(String id, String usuarioNombre) {
        Venta venta = ventaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));

        if (venta.getEstado() == Venta.EstadoVenta.ANULADO)
            throw new RuntimeException("La venta ya está anulada");

        venta.setEstado(Venta.EstadoVenta.ANULADO);
        venta.setAnuladaAt(LocalDateTime.now());
        ventaRepository.save(venta);

        // Liberar asiento
        asientoService.liberarAsiento(id);

        // Egreso (devolución) en la caja abierta del usuario que anula
        cajaService.registrarMovimientoAutomatico(usuarioNombre,
                MovimientoCaja.TipoMovimiento.EGRESO,
                venta.getPrecio(),
                "Anulación venta " + venta.getSerieComprobante() + "-" + venta.getNumeroComprobante()
                        + " — " + venta.getPasajeroNombre());

        auditoriaService.registrar("ANULAR", "VENTAS", venta.getId(),
                "Venta " + venta.getSerieComprobante() + "-" + venta.getNumeroComprobante()
                        + " de " + venta.getPasajeroNombre() + " (S/ " + venta.getPrecio() + ")");

        return toDTO(venta);
    }

    private void guardarTramosUsados(Venta venta, int ordenOrigen, int ordenDestino) {
        List<VentaTramoUsado> tramos = new ArrayList<>();
        for (int i = ordenOrigen; i < ordenDestino; i++) {
            VentaTramoUsado t = new VentaTramoUsado();
            t.setId(UUID.randomUUID().toString());
            t.setVenta(venta);
            t.setTramo(String.valueOf(i));
            tramos.add(t);
        }
        tramoUsadoRepository.saveAll(tramos);
    }

    // Correlativo basado en el máximo emitido (count() se descuadra si se borran filas
    // y puede duplicar números con ventas simultáneas)
    private String generarNumeroComprobante() {
        long siguiente = ventaRepository.findTopByOrderByNumeroComprobanteDesc()
                .map(v -> {
                    try { return Long.parseLong(v.getNumeroComprobante()) + 1; }
                    catch (NumberFormatException e) { return ventaRepository.count() + 1; }
                })
                .orElse(1L);
        return String.format("%08d", siguiente);
    }

    public VentaService(VentaRepository ventaRepository,
                        VentaTramoUsadoRepository tramoUsadoRepository,
                        ViajeRepository viajeRepository,
                        UsuarioRepository usuarioRepository,
                        AsientoService asientoService,
                        EmailService emailService,
                        CajaService cajaService,
                        AuditoriaService auditoriaService) {
        this.ventaRepository      = ventaRepository;
        this.tramoUsadoRepository = tramoUsadoRepository;
        this.viajeRepository      = viajeRepository;
        this.usuarioRepository    = usuarioRepository;
        this.asientoService       = asientoService;
        this.emailService         = emailService;
        this.cajaService          = cajaService;
        this.auditoriaService     = auditoriaService;
    }

    public void enviarComprobante(String id) {
        Venta v = ventaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));

        if (v.getClienteEmail() == null || v.getClienteEmail().isEmpty())
            throw new RuntimeException("Esta venta no tiene correo registrado");

        try {
            emailService.enviarComprobante(
                    v.getClienteEmail(),
                    v.getPasajeroNombre(),
                    v.getSerieComprobante() + "-" + v.getNumeroComprobante(),
                    v.getViajeDescripcion(),
                    v.getFechaVenta() != null ? v.getFechaVenta().toString() : "—",
                    v.getAsientoTipo() + " #" + v.getAsientoNumero(),
                    v.getPrecio() != null ? v.getPrecio().toString() : "—",
                    v.getCodigoQr()
            );
        } catch (Exception e) {
            throw new RuntimeException("Error al enviar correo: " + e.getMessage());
        }
    }

    private VentaDTO toDTO(Venta v) {
        VentaDTO dto = new VentaDTO();
        dto.setId(v.getId());
        dto.setViajeId(v.getViajeId());
        dto.setViajeCodigo(v.getViajeCodigo());
        dto.setViajeDescripcion(v.getViajeDescripcion());

        // Fecha y hora de salida del viaje (para el ticket y la ventana de embarque)
        if (v.getViajeId() != null) {
            viajeRepository.findById(v.getViajeId()).ifPresent(viaje -> {
                dto.setFechaSalida(viaje.getFechaSalida() != null ? viaje.getFechaSalida().toString() : null);
                dto.setHoraSalida(viaje.getHoraSalida() != null ? viaje.getHoraSalida().toString() : null);
            });
        }
        dto.setTipoDocumento(v.getTipoDocumento() != null ? v.getTipoDocumento().name() : null);
        dto.setPasajeroNombre(v.getPasajeroNombre());
        dto.setPasajeroDocumento(v.getPasajeroDocumento());
        dto.setProcedencia(v.getProcedencia());
        dto.setPasajeroTelefono(v.getPasajeroTelefono());
        dto.setClienteEmail(v.getClienteEmail());
        dto.setEdad(v.getEdad());
        dto.setSexo(v.getSexo() != null ? v.getSexo().name() : null);
        dto.setObservacion(v.getObservacion());
        dto.setTipoComprobante(v.getTipoComprobante() != null ? v.getTipoComprobante().name() : null);
        dto.setSerieComprobante(v.getSerieComprobante());
        dto.setNumeroComprobante(v.getNumeroComprobante());
        dto.setClienteNombre(v.getClienteNombre());
        dto.setClienteTipoDoc(v.getClienteTipoDoc());
        dto.setClienteDocumento(v.getClienteDocumento());
        dto.setDetalleComprobante(v.getDetalleComprobante());
        dto.setAsientoNumero(v.getAsientoNumero());
        dto.setAsientoTipo(v.getAsientoTipo() != null ? v.getAsientoTipo().name() : null);
        dto.setParadaOrigen(v.getParadaOrigen());
        dto.setParadaDestino(v.getParadaDestino());
        dto.setOrdenOrigen(v.getOrdenOrigen());
        dto.setOrdenDestino(v.getOrdenDestino());
        dto.setPrecio(v.getPrecio());
        dto.setCodigoQr(v.getCodigoQr());
        dto.setEmbarqueEstado(v.getEmbarqueEstado() != null ? v.getEmbarqueEstado().name() : null);
        dto.setEstado(v.getEstado() != null ? v.getEstado().name() : null);
        // Las ventas antiguas no tienen canal; se asumen de mostrador
        dto.setCanal(v.getCanal() != null && !v.getCanal().isBlank() ? v.getCanal() : "MOSTRADOR");
        dto.setFechaVenta(v.getFechaVenta() != null ? v.getFechaVenta().toString() : null);
        dto.setUsuarioNombre(v.getUsuarioNombre());

        if (v.getTramosUsados() != null) {
            dto.setTramosUsados(v.getTramosUsados().stream()
                    .map(VentaTramoUsado::getTramo)
                    .collect(Collectors.toList()));
        }

        dto.setCreatedAt(v.getCreatedAt() != null ? v.getCreatedAt().toString() : null);
        dto.setEmbarcadoPor(v.getEmbarcadoPor());
        dto.setEmbarcadoAt(v.getEmbarcadoAt() != null ? v.getEmbarcadoAt().toString() : null);

        return dto;
    }
}