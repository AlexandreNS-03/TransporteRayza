package com.example.demo.service;

import com.example.demo.dto.DashboardDTO;
import com.example.demo.model.Venta;
import com.example.demo.model.Viaje;
import com.example.demo.repository.VentaRepository;
import com.example.demo.repository.ViajeRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.stream.Collectors;

import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;

@Service
public class DashboardService {

    private final VentaRepository ventaRepository;
    private final ViajeRepository viajeRepository;
    private final com.example.demo.repository.UsuarioRepository usuarioRepository;

    public DashboardService(VentaRepository ventaRepository,
                            ViajeRepository viajeRepository,
                            com.example.demo.repository.UsuarioRepository usuarioRepository) {
        this.ventaRepository = ventaRepository;
        this.viajeRepository = viajeRepository;
        this.usuarioRepository = usuarioRepository;
    }

    public DashboardDTO obtenerEstadisticas(String usuarioNombre) {
        LocalDate hoy       = LocalDate.now();
        LocalDate inicioSemana = hoy.minusDays(hoy.getDayOfWeek().getValue() - 1);
        LocalDate inicioMes    = hoy.with(TemporalAdjusters.firstDayOfMonth());

        List<Venta> todasVentas = ventaRepository.findAll();
        List<Viaje> todosViajes = viajeRepository.findAll();

        // Cada usuario ve solo su sucursal (ADMIN y sin sucursal ven todo).
        com.example.demo.model.Usuario u = usuarioNombre != null
                ? usuarioRepository.findByUsername(usuarioNombre).orElse(null) : null;
        if (u != null && u.getRol() != com.example.demo.model.Rol.ADMIN && u.getSucursalId() != null) {
            String sucursalId = u.getSucursalId();
            todosViajes = todosViajes.stream()
                    .filter(v -> sucursalId.equals(v.getSucursalId()))
                    .collect(Collectors.toList());
            java.util.Set<String> misViajes = todosViajes.stream()
                    .map(Viaje::getId).collect(Collectors.toSet());
            todasVentas = todasVentas.stream()
                    .filter(v -> v.getViajeId() != null && misViajes.contains(v.getViajeId()))
                    .collect(Collectors.toList());
        }

        // Filtrar ventas pagadas
        List<Venta> ventasPagadas = todasVentas.stream()
                .filter(v -> v.getEstado() == Venta.EstadoVenta.PAGADO)
                .collect(Collectors.toList());

        // HOY
        List<Venta> ventasHoy = ventasPagadas.stream()
                .filter(v -> hoy.equals(v.getFechaVenta()))
                .collect(Collectors.toList());

        int totalViajesHoy = (int) todosViajes.stream()
                .filter(v -> hoy.equals(v.getFechaSalida()))
                .count();

        BigDecimal ingresosHoy = ventasHoy.stream()
                .map(v -> v.getPrecio() != null ? v.getPrecio() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int embarcadosHoy = (int) ventasHoy.stream()
                .filter(v -> v.getEmbarqueEstado() == Venta.EmbarqueEstado.EMBARCADO)
                .count();

        // Efectivo cobrado HOY separado por oficina (para cuadrar caja).
        // Solo cuenta el efectivo físico: método EFECTIVO (o sin método, ventas antiguas).
        BigDecimal efectivoIquitosHoy = ventasHoy.stream()
                .filter(v -> "IQUITOS".equalsIgnoreCase(v.getLugarPago()) && esEfectivo(v))
                .map(v -> v.getPrecio() != null ? v.getPrecio() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal efectivoRequenaHoy = ventasHoy.stream()
                .filter(v -> "REQUENA".equalsIgnoreCase(v.getLugarPago()) && esEfectivo(v))
                .map(v -> v.getPrecio() != null ? v.getPrecio() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal descuentosHoy = ventasHoy.stream()
                .map(v -> v.getDescuento() != null ? v.getDescuento() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Cobros de HOY por método de pago (efectivo, yape, plin, tarjeta, transferencia)
        java.util.LinkedHashMap<String, BigDecimal> porMetodo = new java.util.LinkedHashMap<>();
        for (String m : java.util.List.of("EFECTIVO", "YAPE", "PLIN", "TARJETA", "TRANSFERENCIA"))
            porMetodo.put(m, BigDecimal.ZERO);
        for (Venta v : ventasHoy) {
            // Una venta web sin método registrado (compras viejas) no es efectivo:
            // se agrupa aparte en vez de inflar la gaveta.
            String m = (v.getMetodoPago() == null || v.getMetodoPago().isBlank())
                    ? (esWeb(v) ? "WEB SIN REGISTRAR" : "EFECTIVO")
                    : v.getMetodoPago().toUpperCase();
            BigDecimal monto = v.getPrecio() != null ? v.getPrecio() : BigDecimal.ZERO;
            porMetodo.merge(m, monto, BigDecimal::add);
        }
        List<DashboardDTO.CobroMetodoDTO> cobrosMetodoHoy = porMetodo.entrySet().stream()
                .filter(e -> e.getValue().signum() > 0)
                .map(e -> new DashboardDTO.CobroMetodoDTO(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
        BigDecimal digitalHoy = ventasHoy.stream()
                .filter(v -> !esEfectivo(v))
                .map(v -> v.getPrecio() != null ? v.getPrecio() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal efectivoHoy = ingresosHoy.subtract(digitalHoy);

        // Compras por la web, separadas del mostrador.
        List<Venta> ventasWebHoy = ventasHoy.stream().filter(this::esWeb).collect(Collectors.toList());
        BigDecimal ingresosWebHoy = ventasWebHoy.stream()
                .map(v -> v.getPrecio() != null ? v.getPrecio() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal ingresosMostradorHoy = ingresosHoy.subtract(ingresosWebHoy);

        // Y por qué pasarela entró cada sol (Izipay o Mercado Pago).
        java.util.LinkedHashMap<String, BigDecimal> porPasarela = new java.util.LinkedHashMap<>();
        for (Venta v : ventasWebHoy)
            porPasarela.merge(pasarelaDe(v),
                    v.getPrecio() != null ? v.getPrecio() : BigDecimal.ZERO, BigDecimal::add);
        List<DashboardDTO.CobroMetodoDTO> cobrosWebHoy = porPasarela.entrySet().stream()
                .filter(e -> e.getValue().signum() > 0)
                .map(e -> new DashboardDTO.CobroMetodoDTO(e.getKey(), e.getValue()))
                .collect(Collectors.toList());

        // SEMANA
        LocalDate finSemana = inicioSemana.plusDays(6);
        List<Venta> ventasSemana = ventasPagadas.stream()
                .filter(v -> v.getFechaVenta() != null &&
                        !v.getFechaVenta().isBefore(inicioSemana) &&
                        !v.getFechaVenta().isAfter(finSemana))
                .collect(Collectors.toList());

        BigDecimal ingresosSemana = ventasSemana.stream()
                .map(v -> v.getPrecio() != null ? v.getPrecio() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // MES
        List<Venta> ventasMes = ventasPagadas.stream()
                .filter(v -> v.getFechaVenta() != null &&
                        !v.getFechaVenta().isBefore(inicioMes) &&
                        !v.getFechaVenta().isAfter(hoy))
                .collect(Collectors.toList());

        BigDecimal ingresosMes = ventasMes.stream()
                .map(v -> v.getPrecio() != null ? v.getPrecio() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Venta> ventasWebMes = ventasMes.stream().filter(this::esWeb).collect(Collectors.toList());
        BigDecimal ingresosWebMes = ventasWebMes.stream()
                .map(v -> v.getPrecio() != null ? v.getPrecio() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // VIAJES PRÓXIMOS
        List<DashboardDTO.ViajeProximoDTO> viajesProximos = todosViajes.stream()
                .filter(v -> v.getFechaSalida() != null &&
                        !v.getFechaSalida().isBefore(hoy) &&
                        (v.getEstado() == Viaje.EstadoViaje.PROGRAMADO ||
                                v.getEstado() == Viaje.EstadoViaje.EN_CURSO))
                .sorted((a, b) -> {
                    int cmp = a.getFechaSalida().compareTo(b.getFechaSalida());
                    if (cmp != 0) return cmp;
                    return a.getHoraSalida().compareTo(b.getHoraSalida());
                })
                .limit(5)
                .map(v -> new DashboardDTO.ViajeProximoDTO(
                        v.getCodigoViaje(),
                        v.getRutaNombre(),
                        v.getEmbarcacionNombre(),
                        v.getFechaSalida().toString(),
                        v.getHoraSalida().toString(),
                        v.getEstado().name()
                ))
                .collect(Collectors.toList());

        // ÚLTIMAS VENTAS
        List<DashboardDTO.UltimaVentaDTO> ultimasVentas = ventasPagadas.stream()
                .sorted((a, b) -> {
                    if (a.getCreatedAt() == null || b.getCreatedAt() == null) return 0;
                    return b.getCreatedAt().compareTo(a.getCreatedAt());
                })
                .limit(8)
                .map(v -> new DashboardDTO.UltimaVentaDTO(
                        v.getPasajeroNombre(),
                        v.getParadaOrigen(),
                        v.getParadaDestino(),
                        v.getAsientoTipo() != null ? v.getAsientoTipo().name() : null,
                        v.getAsientoNumero(),
                        v.getPrecio(),
                        v.getTipoComprobante() != null ? v.getTipoComprobante().name() : null,
                        v.getFechaVenta() != null ? v.getFechaVenta().toString() : null
                ))
                .collect(Collectors.toList());

        // VENTAS POR DÍA (últimos 7 días)
        LocalDate hace7Dias = hoy.minusDays(6);
        DateTimeFormatter formatoDia = DateTimeFormatter.ofPattern("EEE", new Locale("es", "PE"));

        Map<LocalDate, List<Venta>> ventasPorDiaMap = ventasPagadas.stream()
                .filter(v -> v.getFechaVenta() != null &&
                        !v.getFechaVenta().isBefore(hace7Dias) &&
                        !v.getFechaVenta().isAfter(hoy))
                .collect(Collectors.groupingBy(Venta::getFechaVenta));

        List<DashboardDTO.VentaPorDiaDTO> ventasPorDia = hace7Dias.datesUntil(hoy.plusDays(1))
                .map(dia -> {
                    List<Venta> ventasDelDia = ventasPorDiaMap.getOrDefault(dia, List.of());
                    BigDecimal ingresosDia = ventasDelDia.stream()
                            .map(v -> v.getPrecio() != null ? v.getPrecio() : BigDecimal.ZERO)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    String nombreDia = dia.format(formatoDia);
                    nombreDia = nombreDia.substring(0, 1).toUpperCase() + nombreDia.substring(1);
                    return new DashboardDTO.VentaPorDiaDTO(nombreDia, ventasDelDia.size(), ingresosDia);
                })
                .collect(Collectors.toList());

// TOP RUTAS (del mes actual, reutilizando ventasMes que ya calculaste arriba)
        Map<String, Long> rutasCount = ventasMes.stream()
                .filter(v -> v.getParadaOrigen() != null && v.getParadaDestino() != null)
                .collect(Collectors.groupingBy(
                        v -> v.getParadaOrigen() + " → " + v.getParadaDestino(),
                        Collectors.counting()));

        List<DashboardDTO.TopRutaDTO> topRutas = rutasCount.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> new DashboardDTO.TopRutaDTO(e.getKey(), e.getValue().intValue()))
                .collect(Collectors.toList());

// OCUPACIÓN POR TIPO (del mes actual)
        Map<String, Long> ocupacionMap = ventasMes.stream()
                .filter(v -> v.getAsientoTipo() != null)
                .collect(Collectors.groupingBy(v -> v.getAsientoTipo().name(), Collectors.counting()));

        List<DashboardDTO.OcupacionTipoDTO> ocupacionPorTipo = ocupacionMap.entrySet().stream()
                .map(e -> {
                    String tipo = "VIP".equals(e.getKey()) ? "VIP" :
                            e.getKey().charAt(0) + e.getKey().substring(1).toLowerCase();
                    return new DashboardDTO.OcupacionTipoDTO(tipo, e.getValue().intValue());
                })
                .collect(Collectors.toList());

        // Armar DTO
        DashboardDTO dto = new DashboardDTO();
        dto.setTotalVentasHoy(ventasHoy.size());
        dto.setTotalPasajerosEmbarcados(embarcadosHoy);
        dto.setIngresosHoy(ingresosHoy);
        dto.setEfectivoIquitosHoy(efectivoIquitosHoy);
        dto.setEfectivoRequenaHoy(efectivoRequenaHoy);
        dto.setDescuentosHoy(descuentosHoy);
        dto.setEfectivoHoy(efectivoHoy);
        dto.setDigitalHoy(digitalHoy);
        dto.setCobrosMetodoHoy(cobrosMetodoHoy);
        dto.setTotalVentasSemana(ventasSemana.size());
        dto.setIngresosSemana(ingresosSemana);
        dto.setTotalVentasMes(ventasMes.size());
        dto.setIngresosMes(ingresosMes);
        dto.setTotalVentasWebHoy(ventasWebHoy.size());
        dto.setIngresosWebHoy(ingresosWebHoy);
        dto.setTotalVentasWebMes(ventasWebMes.size());
        dto.setIngresosWebMes(ingresosWebMes);
        dto.setIngresosMostradorHoy(ingresosMostradorHoy);
        dto.setCobrosWebHoy(cobrosWebHoy);
        dto.setViajesProximos(viajesProximos);
        dto.setUltimasVentas(ultimasVentas);
        dto.setVentasPorDia(ventasPorDia);
        dto.setTopRutas(topRutas);
        dto.setOcupacionPorTipo(ocupacionPorTipo);

        return dto;
    }

    /**
     * Efectivo físico, el que de verdad está en la gaveta. Una compra en línea nunca
     * lo es: esa plata entra a la cuenta de la pasarela (Izipay o Mercado Pago), no a
     * la oficina. Antes se contaba como efectivo porque las ventas web quedaban sin
     * método registrado y el "sin método" se asumía efectivo, así que el arqueo pedía
     * un dinero que nadie había recibido en caja.
     */
    private boolean esEfectivo(Venta v) {
        if (esWeb(v)) return false;
        String m = v.getMetodoPago();
        return m == null || m.isBlank() || "EFECTIVO".equalsIgnoreCase(m);
    }

    /** Compra hecha por el cliente en la web, no en el mostrador. */
    private boolean esWeb(Venta v) {
        return "WEB".equalsIgnoreCase(v.getCanal());
    }

    /** Pasarela por la que entró una compra web: TARJETA la cobra Izipay, YAPE Mercado Pago. */
    private String pasarelaDe(Venta v) {
        String m = v.getMetodoPago();
        if (m == null || m.isBlank()) return "SIN REGISTRAR";
        if ("TARJETA".equalsIgnoreCase(m)) return "IZIPAY";
        if ("YAPE".equalsIgnoreCase(m)) return "MERCADO PAGO";
        return m.toUpperCase();
    }
}