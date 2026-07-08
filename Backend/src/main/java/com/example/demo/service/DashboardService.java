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

    public DashboardService(VentaRepository ventaRepository,
                            ViajeRepository viajeRepository) {
        this.ventaRepository = ventaRepository;
        this.viajeRepository = viajeRepository;
    }

    public DashboardDTO obtenerEstadisticas() {
        LocalDate hoy       = LocalDate.now();
        LocalDate inicioSemana = hoy.minusDays(hoy.getDayOfWeek().getValue() - 1);
        LocalDate inicioMes    = hoy.with(TemporalAdjusters.firstDayOfMonth());

        List<Venta> todasVentas = ventaRepository.findAll();
        List<Viaje> todosViajes = viajeRepository.findAll();

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
        dto.setTotalVentasSemana(ventasSemana.size());
        dto.setIngresosSemana(ingresosSemana);
        dto.setTotalVentasMes(ventasMes.size());
        dto.setIngresosMes(ingresosMes);
        dto.setViajesProximos(viajesProximos);
        dto.setUltimasVentas(ultimasVentas);
        dto.setVentasPorDia(ventasPorDia);
        dto.setTopRutas(topRutas);
        dto.setOcupacionPorTipo(ocupacionPorTipo);

        return dto;
    }
}