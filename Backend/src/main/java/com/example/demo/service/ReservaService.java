package com.example.demo.service;

import com.example.demo.dto.ComprobanteDTO;
import com.example.demo.dto.ComprobanteRequest;
import com.example.demo.dto.ConfirmacionDTO;
import com.example.demo.dto.ReservaRequest;
import com.example.demo.dto.ReservaResponse;
import com.example.demo.model.RutaTarifaTramo;
import com.example.demo.model.Venta;
import com.example.demo.model.VentaTramoUsado;
import com.example.demo.model.Viaje;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.repository.RutaTarifaTramoRepository;
import com.example.demo.repository.VentaRepository;
import com.example.demo.repository.VentaTramoUsadoRepository;
import com.example.demo.repository.ViajeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Compra en línea del cliente: crea una reserva que RETIENE el asiento y luego
 * procesa el pago con Culqi. Independiente de la venta del personal (no usa caja).
 */
@Service
public class ReservaService {

    /** Minutos que se sostiene el asiento sin pagar antes de liberarlo. */
    private static final int MINUTOS_RESERVA = 15;

    private final ViajeRepository viajeRepository;
    private final VentaRepository ventaRepository;
    private final VentaTramoUsadoRepository tramoUsadoRepository;
    private final RutaTarifaTramoRepository tarifaRepository;
    private final ClienteRepository clienteRepository;
    private final AsientoService asientoService;
    private final CulqiService culqiService;
    private final VentaService ventaService;
    private final ComprobanteService comprobanteService;

    public ReservaService(ViajeRepository viajeRepository,
                          VentaRepository ventaRepository,
                          VentaTramoUsadoRepository tramoUsadoRepository,
                          RutaTarifaTramoRepository tarifaRepository,
                          ClienteRepository clienteRepository,
                          AsientoService asientoService,
                          CulqiService culqiService,
                          VentaService ventaService,
                          ComprobanteService comprobanteService) {
        this.comprobanteService = comprobanteService;
        this.viajeRepository = viajeRepository;
        this.ventaRepository = ventaRepository;
        this.tramoUsadoRepository = tramoUsadoRepository;
        this.tarifaRepository = tarifaRepository;
        this.clienteRepository = clienteRepository;
        this.asientoService = asientoService;
        this.culqiService = culqiService;
        this.ventaService = ventaService;
    }

    @Transactional
    public ReservaResponse crearReserva(ReservaRequest req, String clienteEmailAutenticado) {
        Viaje viaje = viajeRepository.findById(req.getViajeId())
                .orElseThrow(() -> new RuntimeException("Viaje no encontrado"));
        if (viaje.getEstado() != Viaje.EstadoViaje.PROGRAMADO)
            throw new RuntimeException("Este viaje ya no está disponible para la venta");

        if (req.getAsientoNumero() == null)
            throw new RuntimeException("Selecciona un asiento");
        if (req.getOrdenOrigen() == null || req.getOrdenDestino() == null
                || req.getOrdenOrigen() >= req.getOrdenDestino())
            throw new RuntimeException("Tramo (origen/destino) inválido");
        if (vacio(req.getPasajeroNombre()) || vacio(req.getPasajeroDocumento()))
            throw new RuntimeException("Ingresa el nombre y documento del pasajero");
        if (vacio(req.getClienteEmail()) || !req.getClienteEmail().contains("@"))
            throw new RuntimeException("Ingresa un correo válido");

        // Se valida acá y no al pagar: si faltan datos, el cliente lo corrige antes
        // de que se le cobre, no después.
        validarDatosDelComprobante(req);

        boolean vip = "VIP".equalsIgnoreCase(req.getAsientoTipo());
        BigDecimal precio = calcularPrecio(viaje, req.getOrdenOrigen(), req.getOrdenDestino(), vip);
        if (precio == null)
            throw new RuntimeException("No se pudo determinar la tarifa de este tramo");

        Venta v = new Venta();
        v.setId(UUID.randomUUID().toString());
        v.setViajeId(viaje.getId());
        v.setViajeCodigo(viaje.getCodigoViaje());
        v.setViajeDescripcion(viaje.getRutaNombre());
        v.setTipoDocumento(parseTipoDoc(req.getTipoDocumento()));
        v.setPasajeroNombre(req.getPasajeroNombre().trim());
        v.setPasajeroDocumento(req.getPasajeroDocumento().trim());
        v.setPasajeroTelefono(req.getPasajeroTelefono());
        v.setClienteEmail(req.getClienteEmail().trim());
        v.setEdad(req.getEdad());
        if (req.getSexo() != null && !req.getSexo().isBlank())
            v.setSexo(Venta.Sexo.valueOf(req.getSexo()));
        v.setTipoComprobante(parseComprobante(req.getTipoComprobante()));
        v.setSerieComprobante("T001");
        v.setNumeroComprobante(generarNumeroComprobante());
        v.setClienteNombre(req.getClienteNombre());
        v.setClienteDocumento(req.getClienteDocumento());
        v.setAsientoNumero(req.getAsientoNumero());
        v.setAsientoTipo(vip ? Venta.AsientoTipo.VIP : Venta.AsientoTipo.NORMAL);
        v.setParadaOrigen(req.getParadaOrigen());
        v.setParadaDestino(req.getParadaDestino());
        v.setOrdenOrigen(req.getOrdenOrigen());
        v.setOrdenDestino(req.getOrdenDestino());
        v.setPrecio(precio);
        v.setCodigoQr(UUID.randomUUID().toString());
        v.setEmbarqueEstado(Venta.EmbarqueEstado.PENDIENTE);
        v.setEstado(Venta.EstadoVenta.RESERVADO);
        v.setCanal("WEB");
        v.setReservaExpira(LocalDateTime.now().plusMinutes(MINUTOS_RESERVA));
        v.setFechaVenta(LocalDate.now());
        v.setCreatedAt(LocalDateTime.now());

        if (clienteEmailAutenticado != null) {
            clienteRepository.findByEmail(clienteEmailAutenticado.toLowerCase())
                    .ifPresent(c -> v.setClienteId(c.getId()));
        }

        ventaRepository.save(v);
        guardarTramosUsados(v, req.getOrdenOrigen(), req.getOrdenDestino());

        // Retiene el asiento (el índice único de tramos bloquea a otros compradores).
        asientoService.reservarAsiento(
                viaje.getId(), req.getAsientoNumero(), v.getId(),
                v.getPasajeroNombre(), v.getPasajeroDocumento(), v.getPasajeroTelefono(),
                req.getOrdenOrigen(), req.getOrdenDestino());

        ReservaResponse resp = new ReservaResponse();
        resp.setReservaId(v.getId());
        resp.setMonto(precio);
        resp.setMontoCents(precio.multiply(BigDecimal.valueOf(100)).intValueExact());
        resp.setMoneda("PEN");
        resp.setExpiraEn(v.getReservaExpira().toString());
        resp.setDescripcion("Pasaje " + safe(req.getParadaOrigen()) + " → " + safe(req.getParadaDestino())
                + " · Asiento #" + req.getAsientoNumero());
        return resp;
    }

    @Transactional
    public ConfirmacionDTO pagarReserva(String reservaId, String token, String email) {
        Venta v = ventaRepository.findById(reservaId)
                .orElseThrow(() -> new RuntimeException("Reserva no encontrada"));

        if (v.getEstado() == Venta.EstadoVenta.PAGADO)
            return confirmacion(v, false, "Esta compra ya estaba pagada");

        if (v.getEstado() != Venta.EstadoVenta.RESERVADO)
            throw new RuntimeException("La reserva no está disponible para pago");

        if (v.getReservaExpira() != null && LocalDateTime.now().isAfter(v.getReservaExpira())) {
            v.setEstado(Venta.EstadoVenta.ANULADO);
            v.setAnuladaAt(LocalDateTime.now());
            ventaRepository.save(v);
            asientoService.liberarAsiento(reservaId);
            throw new RuntimeException("La reserva expiró. Vuelve a elegir tu asiento.");
        }

        int cents = v.getPrecio().multiply(BigDecimal.valueOf(100)).intValueExact();
        String correo = (email != null && !email.isBlank()) ? email : v.getClienteEmail();
        String descripcion = "Pasaje Rayza " + safe(v.getParadaOrigen()) + " → " + safe(v.getParadaDestino());

        String chargeId = culqiService.crearCargo(token, cents, correo, descripcion);

        v.setEstado(Venta.EstadoVenta.PAGADO);
        v.setCulqiChargeId(chargeId);
        v.setReservaExpira(null);
        ventaRepository.save(v);

        asientoService.confirmarAsiento(reservaId);

        // El cobro ya se hizo: si la emisión o el correo fallan, la compra sigue siendo
        // válida y se informa en la respuesta. El comprobante se puede reintentar
        // después desde el sistema, sin volver a cobrar.
        ComprobanteDTO comprobante = emitirComprobanteElectronico(v);

        boolean enviado = false;
        try {
            ventaService.enviarComprobante(reservaId);
            enviado = true;
        } catch (Exception e) {
            System.err.println("[Reserva] No se pudo enviar el correo del boleto: " + e.getMessage());
        }

        ConfirmacionDTO dto = confirmacion(v, enviado, "¡Pago realizado con éxito!");
        if (comprobante != null) {
            dto.setComprobanteElectronico(comprobante.getSerie() + "-" + comprobante.getNumero());
            dto.setEnlacePdf(comprobante.getEnlacePdf());
        } else if (esElectronico(v.getTipoComprobante())) {
            dto.setMensaje("¡Pago realizado con éxito! Tu " + v.getTipoComprobante().name().toLowerCase()
                    + " se emitirá en breve y te llegará por correo.");
        }
        return dto;
    }

    /**
     * Emite la boleta o factura en Nubefact usando el mismo camino que el mostrador.
     * Devuelve null si la venta es solo ticket o si la emisión falló.
     */
    private ComprobanteDTO emitirComprobanteElectronico(Venta v) {
        if (!esElectronico(v.getTipoComprobante())) return null;

        boolean factura = v.getTipoComprobante() == Venta.TipoComprobante.FACTURA;

        ComprobanteRequest req = new ComprobanteRequest();
        req.setVentaId(v.getId());
        req.setTipoDeComprobante(factura ? "FACTURA" : "BOLETA");
        req.setClienteEmail(v.getClienteEmail());

        if (factura) {
            req.setClienteTipoDeDocumento("6");                 // 6 = RUC
            req.setClienteNumeroDeDocumento(v.getClienteDocumento());
            req.setClienteDenominacion(v.getClienteNombre());
        } else {
            req.setClienteTipoDeDocumento(codigoSunat(v.getTipoDocumento()));
            req.setClienteNumeroDeDocumento(v.getPasajeroDocumento());
            req.setClienteDenominacion(v.getPasajeroNombre());
        }

        try {
            return comprobanteService.generar(req, "Venta web");
        } catch (Exception e) {
            System.err.println("[Reserva] No se pudo emitir el comprobante de la venta "
                    + v.getId() + ": " + e.getMessage());
            return null;
        }
    }

    /** Mismas reglas que aplica SUNAT al emitir, comprobadas antes de cobrar. */
    private void validarDatosDelComprobante(ReservaRequest req) {
        Venta.TipoComprobante tipo = parseComprobante(req.getTipoComprobante());

        if (tipo == Venta.TipoComprobante.FACTURA) {
            String ruc = req.getClienteDocumento() != null ? req.getClienteDocumento().trim() : "";
            if (!ruc.matches("\\d{11}"))
                throw new RuntimeException("Para una factura necesitas un RUC de 11 dígitos");
            if (vacio(req.getClienteNombre()))
                throw new RuntimeException("Para una factura necesitas la razón social de la empresa");
        } else if (tipo == Venta.TipoComprobante.BOLETA) {
            String doc = req.getPasajeroDocumento() != null ? req.getPasajeroDocumento().trim() : "";
            if ("DNI".equalsIgnoreCase(req.getTipoDocumento()) && !doc.matches("\\d{8}"))
                throw new RuntimeException("Para una boleta el DNI debe tener 8 dígitos");
        }
    }

    private boolean esElectronico(Venta.TipoComprobante t) {
        return t == Venta.TipoComprobante.BOLETA || t == Venta.TipoComprobante.FACTURA;
    }

    /** Código de documento según SUNAT: 1=DNI, 4=CE, 6=RUC, 7=Pasaporte. */
    private String codigoSunat(Venta.TipoDocumento t) {
        if (t == null) return "1";
        switch (t) {
            case CE:         return "4";
            case RUC:        return "6";
            case PASAPORTE:  return "7";
            default:         return "1";
        }
    }

    private ConfirmacionDTO confirmacion(Venta v, boolean correoEnviado, String mensaje) {
        ConfirmacionDTO dto = new ConfirmacionDTO();
        dto.setVentaId(v.getId());
        dto.setEstado(v.getEstado().name());
        dto.setComprobante(v.getSerieComprobante() + "-" + v.getNumeroComprobante());
        dto.setCodigoQr(v.getCodigoQr());
        dto.setPasajeroNombre(v.getPasajeroNombre());
        dto.setRuta(safe(v.getParadaOrigen()) + " → " + safe(v.getParadaDestino()));
        dto.setAsiento((v.getAsientoTipo() != null ? v.getAsientoTipo().name() : "") + " #" + v.getAsientoNumero());
        dto.setPrecio(v.getPrecio());
        dto.setCorreoEnviado(correoEnviado);
        dto.setMensaje(mensaje);
        if (v.getViajeId() != null) {
            viajeRepository.findById(v.getViajeId()).ifPresent(viaje -> {
                dto.setFechaSalida(viaje.getFechaSalida() != null ? viaje.getFechaSalida().toString() : null);
                dto.setHoraSalida(viaje.getHoraSalida() != null ? viaje.getHoraSalida().toString() : null);
            });
        }
        return dto;
    }

    private BigDecimal calcularPrecio(Viaje viaje, int ordenOrigen, int ordenDestino, boolean vip) {
        if (viaje.getRutaId() != null) {
            for (RutaTarifaTramo t : tarifaRepository.findByRutaId(viaje.getRutaId())) {
                if (t.getOrdenOrigen() != null && t.getOrdenDestino() != null
                        && t.getOrdenOrigen() == ordenOrigen && t.getOrdenDestino() == ordenDestino) {
                    return vip ? t.getPrecioVip() : t.getPrecioNormal();
                }
            }
        }
        return vip ? viaje.getPrecioVip() : viaje.getPrecioNormal();
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
        long siguiente = ventaRepository.findTopByOrderByNumeroComprobanteDesc()
                .map(v -> {
                    try { return Long.parseLong(v.getNumeroComprobante()) + 1; }
                    catch (NumberFormatException e) { return ventaRepository.count() + 1; }
                })
                .orElse(1L);
        return String.format("%08d", siguiente);
    }

    private Venta.TipoDocumento parseTipoDoc(String s) {
        try { return Venta.TipoDocumento.valueOf(s); }
        catch (Exception e) { return Venta.TipoDocumento.DNI; }
    }

    private Venta.TipoComprobante parseComprobante(String s) {
        try { return Venta.TipoComprobante.valueOf(s); }
        catch (Exception e) { return Venta.TipoComprobante.BOLETA; }
    }

    private boolean vacio(String s) { return s == null || s.trim().isEmpty(); }
    private String safe(String s) { return s == null ? "" : s; }
}
