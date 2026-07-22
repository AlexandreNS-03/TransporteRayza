package com.example.demo.service;

import com.example.demo.dto.PublicAsientoDTO;
import com.example.demo.dto.PublicRutaDTO;
import com.example.demo.dto.PublicViajeDTO;
import com.example.demo.model.Ruta;
import com.example.demo.model.RutaTarifaTramo;
import com.example.demo.model.Viaje;
import com.example.demo.model.ViajeAsientoEstado;
import com.example.demo.model.ViajeParada;
import com.example.demo.repository.EmbarcacionRepository;
import com.example.demo.repository.RutaRepository;
import com.example.demo.repository.RutaTarifaTramoRepository;
import com.example.demo.repository.ViajeAsientoEstadoRepository;
import com.example.demo.repository.ViajeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.beans.factory.annotation.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Lógica de la web pública (sin login): ubicaciones, rutas, búsqueda de viajes y
 * mapa de asientos. Solo lectura; reutiliza el modelo del sistema interno.
 */
@Service
public class PublicService {

    private final ViajeRepository viajeRepository;
    private final RutaRepository rutaRepository;
    private final RutaTarifaTramoRepository tarifaRepository;
    private final ViajeAsientoEstadoRepository asientoEstadoRepo;
    private final EmbarcacionRepository embarcacionRepository;
    private final AsientoService asientoService;

    /** Minutos mínimos de anticipación para comprar por internet. */
    @Value("${app.venta-web.anticipacion-minutos:30}")
    private int anticipacionMinutos;

    public PublicService(ViajeRepository viajeRepository,
                         RutaRepository rutaRepository,
                         RutaTarifaTramoRepository tarifaRepository,
                         ViajeAsientoEstadoRepository asientoEstadoRepo,
                         EmbarcacionRepository embarcacionRepository,
                         AsientoService asientoService) {
        this.viajeRepository = viajeRepository;
        this.rutaRepository = rutaRepository;
        this.tarifaRepository = tarifaRepository;
        this.asientoEstadoRepo = asientoEstadoRepo;
        this.embarcacionRepository = embarcacionRepository;
        this.asientoService = asientoService;
    }

    /** Rutas activas con sus paradas y tramos, para armar los combos desde la BD. */
    @Transactional(readOnly = true)
    public List<PublicRutaDTO> listarRutas() {
        List<PublicRutaDTO> resultado = new ArrayList<>();
        for (Ruta r : rutaRepository.findByActivoTrue()) {
            PublicRutaDTO dto = new PublicRutaDTO();
            dto.setId(r.getId());
            dto.setOrigen(r.getOrigen());
            dto.setDestino(r.getDestino());
            dto.setDuracionAproximada(r.getDuracionAproximada());

            if (r.getParadas() != null) {
                dto.setParadas(r.getParadas().stream()
                        .sorted(Comparator.comparing(p -> p.getOrden() == null ? 0 : p.getOrden()))
                        .map(p -> new PublicRutaDTO.Parada(p.getNombre(), p.getOrden()))
                        .collect(Collectors.toList()));
            }

            dto.setTramos(tarifaRepository.findByRutaId(r.getId()).stream()
                    .map(t -> new PublicRutaDTO.Tramo(
                            t.getOrigenTramo(), t.getDestinoTramo(),
                            t.getOrdenOrigen(), t.getOrdenDestino(),
                            t.getPrecioNormal(), t.getPrecioVip()))
                    .sorted(Comparator.comparing((PublicRutaDTO.Tramo t) -> t.getOrdenOrigen() == null ? 0 : t.getOrdenOrigen())
                            .thenComparing(t -> t.getOrdenDestino() == null ? 0 : t.getOrdenDestino()))
                    .collect(Collectors.toList()));

            resultado.add(dto);
        }
        return resultado;
    }

    /** Paradas/ciudades disponibles (respaldo para autocompletar). */
    @Transactional(readOnly = true)
    public List<String> listarUbicaciones() {
        Set<String> ubicaciones = new LinkedHashSet<>();
        for (Ruta r : rutaRepository.findByActivoTrue()) {
            if (r.getOrigen() != null) ubicaciones.add(r.getOrigen().trim());
            if (r.getDestino() != null) ubicaciones.add(r.getDestino().trim());
            if (r.getParadas() != null) {
                r.getParadas().stream()
                        .sorted(Comparator.comparing(p -> p.getOrden() == null ? 0 : p.getOrden()))
                        .forEach(p -> { if (p.getNombre() != null) ubicaciones.add(p.getNombre().trim()); });
            }
        }
        return ubicaciones.stream().sorted(String.CASE_INSENSITIVE_ORDER).collect(Collectors.toList());
    }

    /**
     * Busca viajes PROGRAMADOS. Si se indican origen/destino, filtra a los viajes que
     * pasan por ambas paradas en orden y calcula precio y asientos libres del tramo.
     */
    @Transactional(readOnly = true)
    public List<PublicViajeDTO> buscarViajes(String origen, String destino, LocalDate fecha) {
        List<Viaje> viajes = (fecha != null)
                ? viajeRepository.findByFechaSalidaBetween(fecha, fecha)
                : viajeRepository.findAllByOrderByFechaSalidaDesc();

        List<PublicViajeDTO> resultado = new ArrayList<>();

        for (Viaje v : viajes) {
            if (v.getEstado() != Viaje.EstadoViaje.PROGRAMADO) continue;
            if (!seVendeTodavia(v)) continue;

            List<ViajeParada> paradas = v.getParadas();
            Integer ordenOrigen, ordenDestino;
            String nombreOrigen, nombreDestino;

            if (paradas != null && !paradas.isEmpty()) {
                ordenOrigen  = (origen != null && !origen.isBlank())
                        ? ordenDeParada(paradas, origen) : paradas.get(0).getOrden();
                ordenDestino = (destino != null && !destino.isBlank())
                        ? ordenDeParada(paradas, destino) : paradas.get(paradas.size() - 1).getOrden();
                if (ordenOrigen == null || ordenDestino == null) continue;
                nombreOrigen  = nombreDeOrden(paradas, ordenOrigen);
                nombreDestino = nombreDeOrden(paradas, ordenDestino);
            } else {
                if (origen != null && !origen.isBlank() && !igual(origen, v.getOrigen())) continue;
                if (destino != null && !destino.isBlank() && !igual(destino, v.getDestino())) continue;
                ordenOrigen = 1; ordenDestino = 2;
                nombreOrigen = v.getOrigen(); nombreDestino = v.getDestino();
            }

            if (ordenOrigen >= ordenDestino) continue;

            PublicViajeDTO dto = new PublicViajeDTO();
            dto.setId(v.getId());
            dto.setCodigoViaje(v.getCodigoViaje());
            dto.setRutaNombre(v.getRutaNombre());
            dto.setEmbarcacionNombre(v.getEmbarcacionNombre());
            dto.setOrigen(nombreOrigen);
            dto.setDestino(nombreDestino);
            dto.setOrdenOrigen(ordenOrigen);
            dto.setOrdenDestino(ordenDestino);
            dto.setFechaSalida(v.getFechaSalida() != null ? v.getFechaSalida().toString() : null);
            dto.setHoraSalida(v.getHoraSalida() != null ? v.getHoraSalida().toString() : null);

            BigDecimal[] precios = calcularPrecioTramo(v, ordenOrigen, ordenDestino);
            dto.setPrecioNormal(precios[0]);
            dto.setPrecioVip(precios[1]);

            rutaRepository.findById(v.getRutaId())
                    .ifPresent(r -> dto.setDuracionAproximada(r.getDuracionAproximada()));

            // Posición de la zona VIP y capitán, para dibujar el bote igual que en ventas
            if (v.getEmbarcacionId() != null) {
                embarcacionRepository.findById(v.getEmbarcacionId()).ifPresent(emb -> {
                    dto.setVipPosicion(emb.getVipPosicion() != null ? emb.getVipPosicion().name() : "POPA");
                    dto.setCapitan(emb.getCapitan());
                });
            }

            dto.setAsientosLibres(
                    asientoService.listarLibresPorTramo(v.getId(), ordenOrigen, ordenDestino).size());

            resultado.add(dto);
        }

        resultado.sort(Comparator.comparing(PublicViajeDTO::getFechaSalida,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(PublicViajeDTO::getHoraSalida,
                        Comparator.nullsLast(Comparator.naturalOrder())));
        return resultado;
    }

    /**
     * ¿El viaje sigue a la venta por internet? Se descartan los que ya salieron y los
     * que salen demasiado pronto: comprar en línea un bote que zarpa en cinco minutos
     * no le sirve a nadie. El margen se ajusta con app.venta-web.anticipacion-minutos.
     */
    public boolean seVendeTodavia(Viaje v) {
        if (v.getFechaSalida() == null) return true;   // sin fecha no hay nada que juzgar
        LocalTime hora = v.getHoraSalida() != null ? v.getHoraSalida() : LocalTime.MIDNIGHT;
        LocalDateTime salida = LocalDateTime.of(v.getFechaSalida(), hora);
        return salida.isAfter(LocalDateTime.now().plusMinutes(anticipacionMinutos));
    }

    /**
     * TODOS los asientos del viaje marcando cuáles están libres para el tramo, para
     * dibujar el mapa completo (los ocupados se muestran en gris).
     */
    @Transactional(readOnly = true)
    public List<PublicAsientoDTO> mapaAsientos(String viajeId, int ordenOrigen, int ordenDestino) {
        Set<String> libres = asientoService.listarLibresPorTramo(viajeId, ordenOrigen, ordenDestino)
                .stream().map(a -> String.valueOf(a.getNumero())).collect(Collectors.toSet());

        return asientoEstadoRepo.findByViajeIdOrderByNumeroAsc(viajeId).stream()
                .map((ViajeAsientoEstado a) -> new PublicAsientoDTO(
                        a.getNumero(),
                        a.getTipo() != null ? a.getTipo().name() : "NORMAL",
                        libres.contains(String.valueOf(a.getNumero()))))
                .collect(Collectors.toList());
    }

    /** Precio del tramo: tarifa por tramo si existe; si no, el precio base del viaje. */
    private BigDecimal[] calcularPrecioTramo(Viaje v, int ordenOrigen, int ordenDestino) {
        if (v.getRutaId() != null) {
            for (RutaTarifaTramo t : tarifaRepository.findByRutaId(v.getRutaId())) {
                if (t.getOrdenOrigen() != null && t.getOrdenDestino() != null
                        && t.getOrdenOrigen() == ordenOrigen && t.getOrdenDestino() == ordenDestino) {
                    return new BigDecimal[]{ t.getPrecioNormal(), t.getPrecioVip() };
                }
            }
        }
        return new BigDecimal[]{ v.getPrecioNormal(), v.getPrecioVip() };
    }

    private Integer ordenDeParada(List<ViajeParada> paradas, String nombre) {
        return paradas.stream().filter(p -> igual(p.getNombre(), nombre))
                .map(ViajeParada::getOrden).findFirst().orElse(null);
    }

    private String nombreDeOrden(List<ViajeParada> paradas, Integer orden) {
        return paradas.stream().filter(p -> orden != null && orden.equals(p.getOrden()))
                .map(ViajeParada::getNombre).findFirst().orElse(null);
    }

    private boolean igual(String a, String b) {
        return a != null && b != null && a.trim().equalsIgnoreCase(b.trim());
    }
}
