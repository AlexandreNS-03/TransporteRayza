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

    private String generarCodigo() {
        long siguiente = encomiendaRepository.findTopByOrderByCodigoEncomiendaDesc()
                .map(e -> {
                    try { return Long.parseLong(e.getCodigoEncomienda().replace("ENC-", "")) + 1; }
                    catch (NumberFormatException ex) { return encomiendaRepository.count() + 1; }
                })
                .orElse(1L);
        return String.format("ENC-%06d", siguiente);
    }
}
