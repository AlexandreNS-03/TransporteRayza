package com.example.demo.service;

import com.example.demo.dto.ViajeDTO;
import com.example.demo.dto.ViajeRequest;
import com.example.demo.model.Viaje;
import com.example.demo.model.ViajeParada;
import com.example.demo.repository.ViajeRepository;
import com.example.demo.repository.EmbarcacionRepository;
import com.example.demo.repository.RutaRepository;
import com.example.demo.repository.SucursalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ViajeService {

    private final ViajeRepository      viajeRepository;
    private final AsientoService       asientoService;
    private final EmbarcacionRepository embarcacionRepository;
    private final RutaRepository       rutaRepository;
    private final SucursalRepository   sucursalRepository;

    public ViajeService(ViajeRepository viajeRepository,
                        AsientoService asientoService,
                        EmbarcacionRepository embarcacionRepository,
                        RutaRepository rutaRepository,
                        SucursalRepository sucursalRepository) {
        this.viajeRepository      = viajeRepository;
        this.asientoService       = asientoService;
        this.embarcacionRepository = embarcacionRepository;
        this.rutaRepository       = rutaRepository;
        this.sucursalRepository   = sucursalRepository;
    }

    // Listar todos
    public List<ViajeDTO> listarViajes() {
        return viajeRepository.findAllByOrderByFechaSalidaDesc()
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<ViajeDTO> filtrarPorFechas(String fechaInicio, String fechaFin) {
        LocalDate inicio = LocalDate.parse(fechaInicio);
        LocalDate fin = LocalDate.parse(fechaFin);
        return viajeRepository.findByFechaSalidaBetween(inicio, fin)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // Crear viaje
    @Transactional
    public ViajeDTO crearViaje(ViajeRequest req) {
        var embarcacion = embarcacionRepository.findById(req.getEmbarcacionId())
                .orElseThrow(() -> new RuntimeException("Embarcación no encontrada"));

        var ruta = rutaRepository.findById(req.getRutaId())
                .orElseThrow(() -> new RuntimeException("Ruta no encontrada"));

        var sucursal = sucursalRepository.findById(req.getSucursalId())
                .orElseThrow(() -> new RuntimeException("Sucursal no encontrada"));

        Viaje v = new Viaje();
        v.setId(UUID.randomUUID().toString());
        v.setCodigoViaje(generarCodigo(req, sucursal.getNombre()));
        v.setSucursalId(sucursal.getId());
        v.setSucursalNombre(sucursal.getNombre());
        v.setRutaId(ruta.getId());
        v.setRutaNombre(ruta.getOrigen() + " → " + ruta.getDestino());
        v.setOrigen(ruta.getOrigen());
        v.setDestino(ruta.getDestino());
        v.setEmbarcacionId(embarcacion.getId());
        v.setEmbarcacionNombre(embarcacion.getNombre());
        v.setFechaSalida(req.getFechaSalida());
        v.setHoraSalida(req.getHoraSalida());
        v.setPrecioNormal(ruta.getPrecioNormal());
        v.setPrecioVip(ruta.getPrecioVip());
        v.setEstado(Viaje.EstadoViaje.PROGRAMADO);
        viajeRepository.save(v);

        // Inicializar asientos automáticamente
        asientoService.inicializarAsientosParaViaje(v.getId(), embarcacion.getId());

        return toDTO(v);
    }

    private String generarCodigo(ViajeRequest req, String sucursalNombre) {
        // Formato: RR-E-20260618-1420-RAY
        String fecha = req.getFechaSalida().toString().replace("-", "");
        String hora  = req.getHoraSalida().toString().replace(":", "").substring(0, 4);
        String suc   = sucursalNombre.substring(0, Math.min(3, sucursalNombre.length())).toUpperCase();
        return "RR-E-" + fecha + "-" + hora + "-" + suc;
    }

    private ViajeDTO toDTO(Viaje v) {
        ViajeDTO dto = new ViajeDTO();
        dto.setId(v.getId());
        dto.setCodigoViaje(v.getCodigoViaje());
        dto.setSucursalId(v.getSucursalId());
        dto.setSucursalNombre(v.getSucursalNombre());
        dto.setRutaNombre(v.getRutaNombre());
        dto.setOrigen(v.getOrigen());
        dto.setDestino(v.getDestino());
        dto.setEmbarcacionNombre(v.getEmbarcacionNombre());

        // Datos de la embarcación necesarios para el mapa de asientos
        if (v.getEmbarcacionId() != null) {
            embarcacionRepository.findById(v.getEmbarcacionId()).ifPresent(emb -> {
                dto.setVipPosicion(emb.getVipPosicion() != null ? emb.getVipPosicion().name() : "POPA");
                dto.setCapitan(emb.getCapitan());
            });
        }
        dto.setFechaSalida(v.getFechaSalida() != null ? v.getFechaSalida().toString() : null);
        dto.setHoraSalida(v.getHoraSalida() != null ? v.getHoraSalida().toString() : null);
        dto.setPrecioNormal(v.getPrecioNormal());
        dto.setPrecioVip(v.getPrecioVip());
        dto.setEstado(v.getEstado() != null ? v.getEstado().name() : null);
        dto.setRutaId(v.getRutaId());

        if (v.getParadas() != null) {
            List<ViajeDTO.ParadaDTO> paradas = v.getParadas().stream()
                    .map(p -> new ViajeDTO.ParadaDTO(p.getNombre(), p.getOrden()))
                    .collect(Collectors.toList());
            dto.setParadas(paradas);
        }

        return dto;
    }
}