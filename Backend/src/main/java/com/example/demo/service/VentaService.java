package com.example.demo.service;

import com.example.demo.dto.VentaDTO;
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
    private final AsientoService asientoService;

    public VentaService(VentaRepository ventaRepository,
                        VentaTramoUsadoRepository tramoUsadoRepository,
                        ViajeRepository viajeRepository,
                        AsientoService asientoService) {
        this.ventaRepository      = ventaRepository;
        this.tramoUsadoRepository = tramoUsadoRepository;
        this.viajeRepository      = viajeRepository;
        this.asientoService       = asientoService;
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

        return toDTO(venta);
    }

    // Anular venta
    @Transactional
    public VentaDTO anularVenta(String id) {
        Venta venta = ventaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));

        if (venta.getEstado() == Venta.EstadoVenta.ANULADO)
            throw new RuntimeException("La venta ya está anulada");

        venta.setEstado(Venta.EstadoVenta.ANULADO);
        venta.setAnuladaAt(LocalDateTime.now());
        ventaRepository.save(venta);

        // Liberar asiento
        asientoService.liberarAsiento(id);

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

    private String generarNumeroComprobante() {
        long total = ventaRepository.count();
        return String.format("%08d", total + 1);
    }

    private VentaDTO toDTO(Venta v) {
        VentaDTO dto = new VentaDTO();
        dto.setId(v.getId());
        dto.setViajeId(v.getViajeId());
        dto.setViajeCodigo(v.getViajeCodigo());
        dto.setViajeDescripcion(v.getViajeDescripcion());
        dto.setTipoDocumento(v.getTipoDocumento() != null ? v.getTipoDocumento().name() : null);
        dto.setPasajeroNombre(v.getPasajeroNombre());
        dto.setPasajeroDocumento(v.getPasajeroDocumento());
        dto.setProcedencia(v.getProcedencia());
        dto.setPasajeroTelefono(v.getPasajeroTelefono());
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
        dto.setFechaVenta(v.getFechaVenta() != null ? v.getFechaVenta().toString() : null);
        dto.setUsuarioNombre(v.getUsuarioNombre());

        if (v.getTramosUsados() != null) {
            dto.setTramosUsados(v.getTramosUsados().stream()
                    .map(VentaTramoUsado::getTramo)
                    .collect(Collectors.toList()));
        }

        return dto;
    }
}