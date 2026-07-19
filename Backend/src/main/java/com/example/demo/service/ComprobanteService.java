package com.example.demo.service;

import com.example.demo.dto.ComprobanteDTO;
import com.example.demo.dto.ComprobanteRequest;
import com.example.demo.model.Comprobante;
import com.example.demo.model.Encomienda;
import com.example.demo.model.Venta;
import com.example.demo.repository.ComprobanteRepository;
import com.example.demo.repository.EncomiendaRepository;
import com.example.demo.repository.VentaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ComprobanteService {

    private final ComprobanteRepository comprobanteRepository;
    private final VentaRepository ventaRepository;
    private final EncomiendaRepository encomiendaRepository;
    private final NubefactService nubefactService;
    private final AuditoriaService auditoriaService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${nubefact.serie.factura:F001}")
    private String serieFactura;

    @Value("${nubefact.serie.boleta:B001}")
    private String serieBoleta;

    // Series de notas de crédito (deben empezar con F o B según el comprobante que modifican)
    @Value("${nubefact.serie.nc-factura:FC01}")
    private String serieNcFactura;

    @Value("${nubefact.serie.nc-boleta:BC01}")
    private String serieNcBoleta;

    public ComprobanteService(ComprobanteRepository comprobanteRepository,
                              VentaRepository ventaRepository,
                              EncomiendaRepository encomiendaRepository,
                              NubefactService nubefactService,
                              AuditoriaService auditoriaService) {
        this.comprobanteRepository  = comprobanteRepository;
        this.ventaRepository        = ventaRepository;
        this.encomiendaRepository   = encomiendaRepository;
        this.nubefactService        = nubefactService;
        this.auditoriaService       = auditoriaService;
    }

    public List<ComprobanteDTO> listar() {
        return comprobanteRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<ComprobanteDTO> listarPorVenta(String ventaId) {
        return comprobanteRepository.findByVentaId(ventaId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    /** Vista previa del JSON en formato Nubefact de un comprobante ya emitido. */
    public Map<String, Object> jsonNubefact(String id) {
        Comprobante c = comprobanteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Comprobante no encontrado"));
        return nubefactService.construirJsonEmision(c);
    }

    @Transactional
    public ComprobanteDTO generar(ComprobanteRequest req, String usuarioNombre) {
        // El comprobante puede ser por una venta de pasaje o por una encomienda
        Venta venta = null;
        Encomienda encomienda = null;
        BigDecimal total;
        String descripcionDefecto;

        if (req.getEncomiendaId() != null && !req.getEncomiendaId().isBlank()) {
            encomienda = encomiendaRepository.findById(req.getEncomiendaId())
                    .orElseThrow(() -> new RuntimeException("Encomienda no encontrada"));

            if (encomienda.getEstado() == Encomienda.EstadoEncomienda.DEVUELTO)
                throw new RuntimeException("No se puede emitir un comprobante de una encomienda devuelta");

            if (comprobanteRepository.existsByEncomiendaIdAndEstadoAndTipoDeComprobanteNot(encomienda.getId(),
                    Comprobante.EstadoComprobante.ACEPTADO, Comprobante.TipoComprobante.NOTA_CREDITO))
                throw new RuntimeException("Esta encomienda ya tiene un comprobante emitido");

            total = encomienda.getPrecio();
            descripcionDefecto = descripcionPorDefecto(encomienda);
        } else {
            venta = ventaRepository.findById(req.getVentaId())
                    .orElseThrow(() -> new RuntimeException("Venta no encontrada"));

            if (venta.getEstado() == Venta.EstadoVenta.ANULADO)
                throw new RuntimeException("No se puede emitir un comprobante de una venta anulada");

            if (comprobanteRepository.existsByVentaIdAndEstadoAndTipoDeComprobanteNot(req.getVentaId(),
                    Comprobante.EstadoComprobante.ACEPTADO, Comprobante.TipoComprobante.NOTA_CREDITO))
                throw new RuntimeException("Esta venta ya tiene un comprobante emitido");

            total = venta.getPrecio();
            descripcionDefecto = descripcionPorDefecto(venta);
        }

        Comprobante.TipoComprobante tipo = Comprobante.TipoComprobante.valueOf(req.getTipoDeComprobante());
        if (tipo == Comprobante.TipoComprobante.NOTA_CREDITO)
            throw new RuntimeException("Las notas de crédito se emiten desde un comprobante existente");

        // Validaciones SUNAT
        String doc = req.getClienteNumeroDeDocumento() != null ? req.getClienteNumeroDeDocumento().trim() : "";
        if (tipo == Comprobante.TipoComprobante.FACTURA) {
            if (!"6".equals(req.getClienteTipoDeDocumento()))
                throw new RuntimeException("La factura requiere un cliente con RUC");
            if (!doc.matches("\\d{11}"))
                throw new RuntimeException("El RUC debe tener 11 dígitos");
        } else {
            if ("1".equals(req.getClienteTipoDeDocumento()) && !doc.matches("\\d{8}"))
                throw new RuntimeException("El DNI debe tener 8 dígitos");
        }
        if (req.getClienteDenominacion() == null || req.getClienteDenominacion().isBlank())
            throw new RuntimeException("La denominación / razón social del cliente es obligatoria");

        String serie = tipo == Comprobante.TipoComprobante.FACTURA ? serieFactura : serieBoleta;
        long numero = comprobanteRepository.findTopByTipoDeComprobanteAndSerieOrderByNumeroDesc(tipo, serie)
                .map(c -> c.getNumero() + 1).orElse(1L);

        // Operación exonerada de IGV (Ley 27037 - Amazonía): el precio es monto fijo, IGV = 0
        if (total == null)
            throw new RuntimeException("La operación no tiene precio registrado");

        Comprobante c = new Comprobante();
        c.setId(UUID.randomUUID().toString());
        c.setVentaId(venta != null ? venta.getId() : null);
        c.setEncomiendaId(encomienda != null ? encomienda.getId() : null);
        c.setTipoDeComprobante(tipo);
        c.setSerie(serie);
        c.setNumero(numero);
        c.setClienteTipoDeDocumento(req.getClienteTipoDeDocumento());
        c.setClienteNumeroDeDocumento(doc);
        c.setClienteDenominacion(req.getClienteDenominacion().trim());
        c.setClienteDireccion(req.getClienteDireccion());
        c.setClienteEmail(req.getClienteEmail());
        c.setFechaDeEmision(LocalDate.now());
        c.setMoneda(1); // PEN
        c.setPorcentajeDeIgv(new BigDecimal("18.00")); // tasa legal vigente (Nubefact la exige aunque la operación esté exonerada)
        c.setTotalExonerada(total);
        c.setTotalIgv(BigDecimal.ZERO);
        c.setTotal(total);
        c.setDescripcion(req.getDescripcion() != null && !req.getDescripcion().isBlank()
                ? req.getDescripcion()
                : descripcionDefecto);
        c.setEstado(Comprobante.EstadoComprobante.ACEPTADO);
        c.setUsuarioNombre(usuarioNombre);
        c.setCreatedAt(LocalDateTime.now());

        // Envío a Nubefact (si está habilitado)
        Map<String, Object> json = nubefactService.construirJsonEmision(c);
        Map<String, Object> respuesta = nubefactService.enviar(json);
        if (respuesta != null) {
            c.setEnlacePdf((String) respuesta.get("enlace_del_pdf"));
            c.setRespuestaNubefact(escribirJson(respuesta));
        }

        comprobanteRepository.save(c);

        auditoriaService.registrar("EMITIR", "COMPROBANTES", c.getId(),
                tipo.name() + " " + serie + "-" + numero + " por S/ " + total
                        + " — " + c.getClienteDenominacion());

        return toDTO(c);
    }

    /**
     * Emite una nota de crédito (anulación de la operación) sobre un comprobante aceptado.
     * SUNAT solo permite la comunicación de baja directa por pocos días; pasado ese plazo
     * la anulación se hace con nota de crédito.
     */
    @Transactional
    public ComprobanteDTO emitirNotaCredito(String comprobanteId, String motivo, String usuarioNombre) {
        Comprobante original = comprobanteRepository.findById(comprobanteId)
                .orElseThrow(() -> new RuntimeException("Comprobante no encontrado"));

        if (original.getEstado() != Comprobante.EstadoComprobante.ACEPTADO)
            throw new RuntimeException("Solo se puede emitir nota de crédito de un comprobante aceptado");

        if (original.getTipoDeComprobante() == Comprobante.TipoComprobante.NOTA_CREDITO)
            throw new RuntimeException("No se puede emitir una nota de crédito de otra nota de crédito");

        if (motivo == null || motivo.isBlank())
            throw new RuntimeException("El motivo de la nota de crédito es obligatorio");

        String serie = original.getTipoDeComprobante() == Comprobante.TipoComprobante.FACTURA
                ? serieNcFactura : serieNcBoleta;
        long numero = comprobanteRepository
                .findTopByTipoDeComprobanteAndSerieOrderByNumeroDesc(Comprobante.TipoComprobante.NOTA_CREDITO, serie)
                .map(c -> c.getNumero() + 1).orElse(1L);

        Comprobante nc = new Comprobante();
        nc.setId(UUID.randomUUID().toString());
        nc.setVentaId(original.getVentaId());
        nc.setEncomiendaId(original.getEncomiendaId());
        nc.setTipoDeComprobante(Comprobante.TipoComprobante.NOTA_CREDITO);
        nc.setSerie(serie);
        nc.setNumero(numero);
        nc.setClienteTipoDeDocumento(original.getClienteTipoDeDocumento());
        nc.setClienteNumeroDeDocumento(original.getClienteNumeroDeDocumento());
        nc.setClienteDenominacion(original.getClienteDenominacion());
        nc.setClienteDireccion(original.getClienteDireccion());
        nc.setClienteEmail(original.getClienteEmail());
        nc.setFechaDeEmision(LocalDate.now());
        nc.setMoneda(1);
        nc.setPorcentajeDeIgv(original.getPorcentajeDeIgv());
        nc.setTotalExonerada(original.getTotalExonerada());
        nc.setTotalIgv(BigDecimal.ZERO);
        nc.setTotal(original.getTotal());
        nc.setDescripcion("Anulación de la operación — " + motivo.trim());
        nc.setEstado(Comprobante.EstadoComprobante.ACEPTADO);
        nc.setRefSerie(original.getSerie());
        nc.setRefNumero(original.getNumero());
        nc.setUsuarioNombre(usuarioNombre);
        nc.setCreatedAt(LocalDateTime.now());

        // Envío a Nubefact (si está habilitado)
        Map<String, Object> json = nubefactService.construirJsonEmision(nc);
        Map<String, Object> respuesta = nubefactService.enviar(json);
        if (respuesta != null) {
            nc.setEnlacePdf((String) respuesta.get("enlace_del_pdf"));
            nc.setRespuestaNubefact(escribirJson(respuesta));
        }
        comprobanteRepository.save(nc);

        // El comprobante original queda anulado por la nota de crédito
        original.setEstado(Comprobante.EstadoComprobante.ANULADO);
        original.setMotivoAnulacion("Anulado con Nota de Crédito " + serie + "-" + numero + ": " + motivo.trim());
        original.setAnuladoAt(LocalDateTime.now());
        comprobanteRepository.save(original);

        auditoriaService.registrar("NOTA_CREDITO", "COMPROBANTES", nc.getId(),
                "NC " + serie + "-" + numero + " anula " + original.getSerie() + "-" + original.getNumero()
                        + ". Motivo: " + motivo.trim());

        return toDTO(nc);
    }

    @Transactional
    public ComprobanteDTO anular(String id, String motivo) {
        Comprobante c = comprobanteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Comprobante no encontrado"));

        if (c.getEstado() == Comprobante.EstadoComprobante.ANULADO)
            throw new RuntimeException("El comprobante ya está anulado");

        if (motivo == null || motivo.isBlank())
            throw new RuntimeException("El motivo de anulación es obligatorio");

        // Comunicación de baja a Nubefact (si está habilitado)
        Map<String, Object> json = nubefactService.construirJsonAnulacion(c, motivo);
        Map<String, Object> respuesta = nubefactService.enviar(json);
        if (respuesta != null) {
            c.setRespuestaNubefact(escribirJson(respuesta));
        }

        c.setEstado(Comprobante.EstadoComprobante.ANULADO);
        c.setMotivoAnulacion(motivo.trim());
        c.setAnuladoAt(LocalDateTime.now());
        comprobanteRepository.save(c);

        auditoriaService.registrar("ANULAR", "COMPROBANTES", c.getId(),
                c.getTipoDeComprobante().name() + " " + c.getSerie() + "-" + c.getNumero()
                        + ". Motivo: " + motivo.trim());

        return toDTO(c);
    }

    private String descripcionPorDefecto(Venta v) {
        return String.format("Servicio de transporte fluvial %s - %s, Viaje %s, Asiento %s #%d",
                v.getParadaOrigen(), v.getParadaDestino(), v.getViajeCodigo(),
                v.getAsientoTipo(), v.getAsientoNumero());
    }

    private String descripcionPorDefecto(Encomienda e) {
        StringBuilder sb = new StringBuilder("Servicio de encomienda " + e.getCodigoEncomienda()
                + ": " + e.getDescripcion());
        if (e.getPeso() != null) sb.append(" (").append(e.getPeso()).append(" kg)");
        if (e.getSucursalOrigenNombre() != null && e.getSucursalDestinoNombre() != null)
            sb.append(", ").append(e.getSucursalOrigenNombre()).append(" - ").append(e.getSucursalDestinoNombre());
        return sb.toString();
    }

    private String escribirJson(Map<String, Object> mapa) {
        try { return objectMapper.writeValueAsString(mapa); }
        catch (Exception e) { return null; }
    }

    private ComprobanteDTO toDTO(Comprobante c) {
        ComprobanteDTO dto = new ComprobanteDTO();
        dto.setId(c.getId());
        dto.setVentaId(c.getVentaId());
        dto.setEncomiendaId(c.getEncomiendaId());
        dto.setTipoDeComprobante(c.getTipoDeComprobante().name());
        dto.setSerie(c.getSerie());
        dto.setNumero(c.getNumero());
        dto.setClienteTipoDeDocumento(c.getClienteTipoDeDocumento());
        dto.setClienteNumeroDeDocumento(c.getClienteNumeroDeDocumento());
        dto.setClienteDenominacion(c.getClienteDenominacion());
        dto.setClienteDireccion(c.getClienteDireccion());
        dto.setClienteEmail(c.getClienteEmail());
        dto.setFechaDeEmision(c.getFechaDeEmision() != null ? c.getFechaDeEmision().toString() : null);
        dto.setMoneda(c.getMoneda());
        dto.setPorcentajeDeIgv(c.getPorcentajeDeIgv());
        dto.setTotalExonerada(c.getTotalExonerada());
        dto.setTotalIgv(c.getTotalIgv());
        dto.setTotal(c.getTotal());
        dto.setDescripcion(c.getDescripcion());
        dto.setEstado(c.getEstado().name());
        dto.setMotivoAnulacion(c.getMotivoAnulacion());
        dto.setAnuladoAt(c.getAnuladoAt() != null ? c.getAnuladoAt().toString() : null);
        dto.setEnlacePdf(c.getEnlacePdf());
        dto.setUsuarioNombre(c.getUsuarioNombre());
        dto.setCreatedAt(c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
        dto.setRefSerie(c.getRefSerie());
        dto.setRefNumero(c.getRefNumero());

        // Referencia mostrada en el historial: venta (viaje + pasajero) o encomienda (código + remitente)
        if (c.getVentaId() != null) {
            ventaRepository.findById(c.getVentaId()).ifPresent(v -> {
                dto.setViajeCodigo(v.getViajeCodigo());
                dto.setPasajeroNombre(v.getPasajeroNombre());
            });
        } else if (c.getEncomiendaId() != null) {
            encomiendaRepository.findById(c.getEncomiendaId()).ifPresent(e -> {
                dto.setViajeCodigo(e.getCodigoEncomienda());
                dto.setPasajeroNombre(e.getRemitenteNombre() + " → " + e.getDestinatarioNombre());
            });
        }

        return dto;
    }
}
