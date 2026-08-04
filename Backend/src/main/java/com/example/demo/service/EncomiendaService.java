package com.example.demo.service;

import com.example.demo.dto.EncomiendaRequest;
import com.example.demo.model.Encomienda;
import com.example.demo.model.MovimientoCaja;
import com.example.demo.model.Sucursal;
import com.example.demo.model.Usuario;
import com.example.demo.model.Viaje;
import com.example.demo.repository.EncomiendaRepository;
import com.example.demo.repository.SucursalRepository;
import com.example.demo.repository.UsuarioRepository;
import com.example.demo.repository.ViajeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class EncomiendaService {

    private final EncomiendaRepository encomiendaRepository;
    private final UsuarioRepository usuarioRepository;
    private final SucursalRepository sucursalRepository;
    private final ViajeRepository viajeRepository;
    private final CajaService cajaService;
    private final AuditoriaService auditoriaService;

    public EncomiendaService(EncomiendaRepository encomiendaRepository,
                             UsuarioRepository usuarioRepository,
                             SucursalRepository sucursalRepository,
                             ViajeRepository viajeRepository,
                             CajaService cajaService,
                             AuditoriaService auditoriaService) {
        this.encomiendaRepository = encomiendaRepository;
        this.usuarioRepository    = usuarioRepository;
        this.sucursalRepository   = sucursalRepository;
        this.viajeRepository      = viajeRepository;
        this.cajaService          = cajaService;
        this.auditoriaService     = auditoriaService;
    }

    public List<Encomienda> listar() {
        return encomiendaRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public Encomienda crear(EncomiendaRequest req, String usuarioNombre) {
        if (req.getRemitenteNombre() == null || req.getRemitenteNombre().isBlank())
            throw new RuntimeException("El nombre del remitente es obligatorio");
        if (req.getDestinatarioNombre() == null || req.getDestinatarioNombre().isBlank())
            throw new RuntimeException("El nombre del destinatario es obligatorio");
        if (req.getDescripcion() == null || req.getDescripcion().isBlank())
            throw new RuntimeException("La descripción del paquete es obligatoria");
        if (req.getPrecio() == null || req.getPrecio().signum() <= 0)
            throw new RuntimeException("El precio del envío debe ser mayor a cero");
        String clave = req.getClaveSeguridad() == null ? "" : req.getClaveSeguridad().trim();
        if (!clave.matches("\\d{4}"))
            throw new RuntimeException("La clave de seguridad debe ser de 4 dígitos");

        Usuario usuario = usuarioRepository.findByUsername(usuarioNombre).orElse(null);

        Encomienda e = new Encomienda();
        e.setId(UUID.randomUUID().toString());
        e.setCodigoEncomienda(generarCodigo());
        e.setFechaRegistro(LocalDate.now());
        e.setRemitenteNombre(req.getRemitenteNombre().trim());
        e.setRemitenteDocumento(req.getRemitenteDocumento());
        e.setRemitenteTelefono(req.getRemitenteTelefono());
        e.setDestinatarioNombre(req.getDestinatarioNombre().trim());
        e.setDestinatarioDocumento(req.getDestinatarioDocumento());
        e.setDestinatarioTelefono(req.getDestinatarioTelefono());
        e.setDescripcion(req.getDescripcion().trim());
        e.setPeso(req.getPeso());
        e.setPrecio(req.getPrecio());
        e.setObservacion(req.getObservacion());
        e.setClaveSeguridad(clave);
        e.setEstado(Encomienda.EstadoEncomienda.REGISTRADO);
        e.setCreatedAt(LocalDateTime.now());

        // Viaje asociado (opcional)
        if (req.getViajeId() != null && !req.getViajeId().isBlank()) {
            Viaje viaje = viajeRepository.findById(req.getViajeId())
                    .orElseThrow(() -> new RuntimeException("Viaje no encontrado"));
            e.setViajeId(viaje.getId());
            e.setViajeDescripcion(viaje.getCodigoViaje() + " — " + viaje.getRutaNombre());
        }

        // Sucursal de origen = la del usuario que registra
        if (usuario != null) {
            e.setUsuarioId(usuario.getId());
            e.setSucursalOrigenId(usuario.getSucursalId());
            e.setSucursalOrigenNombre(usuario.getSucursalNombre());
        }
        e.setUsuarioNombre(usuarioNombre);

        // Sucursal de destino
        if (req.getSucursalDestinoId() != null && !req.getSucursalDestinoId().isBlank()) {
            Sucursal destino = sucursalRepository.findById(req.getSucursalDestinoId())
                    .orElseThrow(() -> new RuntimeException("Sucursal de destino no encontrada"));
            e.setSucursalDestinoId(destino.getId());
            e.setSucursalDestinoNombre(destino.getNombre());
        }

        encomiendaRepository.save(e);

        // Ingreso en la caja abierta del usuario
        cajaService.registrarMovimientoAutomatico(usuarioNombre,
                MovimientoCaja.TipoMovimiento.INGRESO,
                e.getPrecio(),
                "Venta encomienda " + e.getCodigoEncomienda() + " — " + e.getRemitenteNombre());

        auditoriaService.registrar("CREAR", "ENCOMIENDAS", e.getId(),
                "Encomienda " + e.getCodigoEncomienda() + " de " + e.getRemitenteNombre()
                        + " para " + e.getDestinatarioNombre() + " (S/ " + e.getPrecio() + ")");

        return e;
    }

    @Transactional
    public Encomienda cambiarEstado(String id, String nuevoEstado, String usuarioNombre) {
        Encomienda e = encomiendaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Encomienda no encontrada"));

        Encomienda.EstadoEncomienda estado;
        try { estado = Encomienda.EstadoEncomienda.valueOf(nuevoEstado); }
        catch (Exception ex) { throw new RuntimeException("Estado inválido"); }

        if (e.getEstado() == Encomienda.EstadoEncomienda.ENTREGADO)
            throw new RuntimeException("La encomienda ya fue entregada");
        // La entrega se hace por el proceso de recojo (valida la clave de seguridad).
        if (estado == Encomienda.EstadoEncomienda.ENTREGADO)
            throw new RuntimeException("Para entregar usa el recojo con la clave de seguridad");

        // DEVUELTO implica devolver el dinero: egreso en la caja del usuario
        if (estado == Encomienda.EstadoEncomienda.DEVUELTO) {
            cajaService.registrarMovimientoAutomatico(usuarioNombre,
                    MovimientoCaja.TipoMovimiento.EGRESO,
                    e.getPrecio(),
                    "Devolución encomienda " + e.getCodigoEncomienda());
        }

        e.setEstado(estado);
        encomiendaRepository.save(e);

        auditoriaService.registrar("CAMBIAR_ESTADO", "ENCOMIENDAS", e.getId(),
                "Encomienda " + e.getCodigoEncomienda() + " → " + estado.name());

        return e;
    }

    /**
     * Recojo/entrega: valida la clave de seguridad de 4 dígitos y registra al
     * receptor (documento de identidad). Solo entonces marca ENTREGADO.
     */
    @Transactional
    public Encomienda entregar(String id, String clave, String receptorNombre,
                               String receptorDocumento, String usuarioNombre) {
        Encomienda e = encomiendaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Encomienda no encontrada"));

        if (e.getEstado() == Encomienda.EstadoEncomienda.ENTREGADO)
            throw new RuntimeException("La encomienda ya fue entregada");
        if (e.getEstado() == Encomienda.EstadoEncomienda.DEVUELTO)
            throw new RuntimeException("La encomienda fue devuelta, no se puede entregar");

        // Verifica la clave (si la encomienda tiene una registrada)
        String claveGuardada = e.getClaveSeguridad();
        if (claveGuardada != null && !claveGuardada.isBlank()) {
            if (clave == null || !claveGuardada.equals(clave.trim()))
                throw new RuntimeException("La clave de seguridad no coincide");
        }
        if (receptorDocumento == null || receptorDocumento.isBlank())
            throw new RuntimeException("El documento de quien recoge es obligatorio");

        e.setEstado(Encomienda.EstadoEncomienda.ENTREGADO);
        e.setReceptorNombre(receptorNombre != null ? receptorNombre.trim() : null);
        e.setReceptorDocumento(receptorDocumento.trim());
        e.setEntregadoAt(LocalDateTime.now());
        encomiendaRepository.save(e);

        auditoriaService.registrar("ENTREGAR", "ENCOMIENDAS", e.getId(),
                "Encomienda " + e.getCodigoEncomienda() + " entregada a "
                        + e.getReceptorDocumento() + (receptorNombre != null ? " (" + receptorNombre + ")" : ""));

        return e;
    }

    private String generarCodigo() {
        long siguiente = encomiendaRepository.findTopByOrderByCodigoEncomiendaDesc()
                .map(e -> {
                    try { return Long.parseLong(e.getCodigoEncomienda().replace("ENC-", "")) + 1; }
                    catch (NumberFormatException ex) { return encomiendaRepository.count() + 1; }
                })
                .orElse(1L);
        return String.format("ENC-%06d", siguiente);
    }

    // ───────────────── Rastreo público (sin login) ─────────────────

    public com.example.demo.dto.EncomiendaPublicDTO rastrearPorCodigo(String codigo) {
        return encomiendaRepository.findByCodigoEncomienda(codigo == null ? "" : codigo.trim())
                .map(this::toPublicDTO)
                .orElseThrow(() -> new RuntimeException("No se encontró ninguna encomienda con ese código"));
    }

    public java.util.List<com.example.demo.dto.EncomiendaPublicDTO> rastrearPorRemitente(String documento) {
        java.util.List<com.example.demo.dto.EncomiendaPublicDTO> r = encomiendaRepository
                .findByRemitenteDocumentoOrderByCreatedAtDesc(documento == null ? "" : documento.trim())
                .stream().map(this::toPublicDTO).collect(java.util.stream.Collectors.toList());
        if (r.isEmpty()) throw new RuntimeException("No se encontraron encomiendas para ese documento");
        return r;
    }

    public java.util.List<com.example.demo.dto.EncomiendaPublicDTO> rastrearPorDestinatario(String documento) {
        java.util.List<com.example.demo.dto.EncomiendaPublicDTO> r = encomiendaRepository
                .findByDestinatarioDocumentoOrderByCreatedAtDesc(documento == null ? "" : documento.trim())
                .stream().map(this::toPublicDTO).collect(java.util.stream.Collectors.toList());
        if (r.isEmpty()) throw new RuntimeException("No se encontraron encomiendas para ese documento");
        return r;
    }

    private com.example.demo.dto.EncomiendaPublicDTO toPublicDTO(Encomienda e) {
        com.example.demo.dto.EncomiendaPublicDTO dto = new com.example.demo.dto.EncomiendaPublicDTO();
        dto.setCodigoEncomienda(e.getCodigoEncomienda());
        dto.setFechaRegistro(e.getFechaRegistro() != null ? e.getFechaRegistro().toString() : null);
        dto.setRemitenteNombre(e.getRemitenteNombre());
        dto.setRemitenteDocumento(e.getRemitenteDocumento());
        dto.setRemitenteTelefono(e.getRemitenteTelefono());
        dto.setDestinatarioNombre(e.getDestinatarioNombre());
        dto.setDestinatarioDocumento(e.getDestinatarioDocumento());
        dto.setDestinatarioTelefono(e.getDestinatarioTelefono());
        dto.setViajeDescripcion(e.getViajeDescripcion());
        dto.setSucursalOrigenNombre(e.getSucursalOrigenNombre());
        dto.setSucursalDestinoNombre(e.getSucursalDestinoNombre());
        dto.setDescripcion(e.getDescripcion());
        dto.setPeso(e.getPeso());
        dto.setPrecio(e.getPrecio());
        dto.setEstado(e.getEstado() != null ? e.getEstado().name() : null);
        return dto;
    }
}
