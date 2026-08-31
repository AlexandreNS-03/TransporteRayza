package com.example.demo.service;

import com.example.demo.dto.ViajeDTO;
import com.example.demo.dto.ViajeRequest;
import com.example.demo.model.Venta;
import com.example.demo.model.Viaje;
import com.example.demo.model.ViajeParada;
import com.example.demo.repository.ViajeRepository;
import com.example.demo.repository.EmbarcacionRepository;
import com.example.demo.repository.RutaParadaRepository;
import com.example.demo.repository.RutaRepository;
import com.example.demo.repository.SucursalRepository;
import com.example.demo.repository.VentaRepository;
import com.example.demo.repository.ViajeParadaRepository;
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
    private final RutaParadaRepository  rutaParadaRepository;
    private final ViajeParadaRepository viajeParadaRepository;
    private final VentaRepository      ventaRepository;
    private final AuditoriaService     auditoriaService;
    private final EmailService         emailService;

    public ViajeService(ViajeRepository viajeRepository,
                        AsientoService asientoService,
                        EmbarcacionRepository embarcacionRepository,
                        RutaRepository rutaRepository,
                        SucursalRepository sucursalRepository,
                        RutaParadaRepository rutaParadaRepository,
                        ViajeParadaRepository viajeParadaRepository,
                        VentaRepository ventaRepository,
                        AuditoriaService auditoriaService,
                        EmailService emailService) {
        this.viajeRepository      = viajeRepository;
        this.asientoService       = asientoService;
        this.embarcacionRepository = embarcacionRepository;
        this.rutaRepository       = rutaRepository;
        this.sucursalRepository   = sucursalRepository;
        this.rutaParadaRepository  = rutaParadaRepository;
        this.viajeParadaRepository = viajeParadaRepository;
        this.ventaRepository       = ventaRepository;
        this.auditoriaService      = auditoriaService;
        this.emailService          = emailService;
    }

    // Listar todos
    public List<ViajeDTO> listarViajes() {
        return listarViajes(null);
    }

    /**
     * @param estados estados separados por coma; si viene vacío, todos.
     */
    public List<ViajeDTO> listarViajes(String estados) {
        java.util.Set<Viaje.EstadoViaje> filtro = new java.util.HashSet<>();
        if (estados != null && !estados.isBlank()) {
            for (String e : estados.split(",")) {
                try { filtro.add(Viaje.EstadoViaje.valueOf(e.trim().toUpperCase())); }
                catch (IllegalArgumentException ignorado) { /* estado desconocido: se ignora */ }
            }
        }
        return viajeRepository.findAllByOrderByFechaSalidaDesc()
                .stream()
                .filter(v -> filtro.isEmpty() || filtro.contains(v.getEstado()))
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
        v.setCodigoViaje(generarCodigo(req, sucursal.getNombre(), embarcacion.getNombre()));
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

        // Copiar las paradas de la ruta al viaje. Sin esto el viaje no tiene tramos
        // y la búsqueda pública cae en el respaldo (vende siempre el recorrido
        // completo como orden 1→2, con nombres que no coinciden con los del mostrador).
        copiarParadasDeLaRuta(v, ruta.getId());

        // Inicializar asientos automáticamente
        asientoService.inicializarAsientosParaViaje(v.getId(), embarcacion.getId());

        return toDTO(v);
    }

    /**
     * Cambia la fecha, la hora o la embarcación de un viaje ya programado.
     *
     * Pasa seguido: el río, el tiempo o la carga corren la salida y el mostrador
     * necesita que el sistema diga la hora de verdad —de ella dependen la
     * ventana de embarque, el manifiesto y lo que ve el pasajero en la web—.
     *
     * Lo que NO cambia es el código del viaje, aunque lleve la hora vieja dentro
     * (RR-E-20260618-1420-…): ese código ya está impreso en los tickets vendidos
     * y en los manifiestos, y es como se los ubica. Es un identificador, no un
     * horario; la hora que manda es la de la columna.
     *
     * @return cuántos pasajeros quedaron avisados por correo
     */
    @Transactional
    public ResultadoEdicion editarViaje(String id, ViajeRequest req, boolean avisar, String usuario) {
        Viaje v = viajeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Viaje no encontrado"));

        if (v.getEstado() == Viaje.EstadoViaje.CANCELADO)
            throw new RuntimeException("El viaje está cancelado. No se puede editar.");
        if (v.getEstado() == Viaje.EstadoViaje.COMPLETADO)
            throw new RuntimeException("El viaje ya se completó. No se puede editar.");

        List<Venta> ventas = ventaRepository.findByViajeId(id).stream()
                .filter(x -> x.getEstado() != Venta.EstadoVenta.ANULADO)
                .toList();

        String antes = descripcionHorario(v);

        if (req.getFechaSalida() != null) v.setFechaSalida(req.getFechaSalida());
        if (req.getHoraSalida()  != null) v.setHoraSalida(req.getHoraSalida());

        // La embarcación solo se puede cambiar con el viaje vacío: los asientos
        // vendidos son los del mapa de la nave anterior, y en otra nave ese
        // número puede no existir o ser de otro tipo. Mover pasajeros de una nave
        // a otra es harina de otro costal.
        if (req.getEmbarcacionId() != null && !req.getEmbarcacionId().equals(v.getEmbarcacionId())) {
            if (!ventas.isEmpty())
                throw new RuntimeException("Este viaje ya tiene " + ventas.size()
                        + " pasaje(s) vendido(s): no se puede cambiar la embarcación sin mover a esos pasajeros.");
            var emb = embarcacionRepository.findById(req.getEmbarcacionId())
                    .orElseThrow(() -> new RuntimeException("Embarcación no encontrada"));
            v.setEmbarcacionId(emb.getId());
            v.setEmbarcacionNombre(emb.getNombre());
            asientoService.inicializarAsientosParaViaje(v.getId(), emb.getId());
        }

        viajeRepository.save(v);

        String despues = descripcionHorario(v);
        auditoriaService.registrar("EDITAR", "VIAJES", v.getId(),
                "Viaje " + v.getCodigoViaje() + ": " + antes + " → " + despues
                        + " (" + ventas.size() + " pasaje(s) vendido(s))");

        int avisados = avisar && !antes.equals(despues) ? avisarPasajeros(v, ventas, antes) : 0;
        return new ResultadoEdicion(toDTO(v), ventas.size(), avisados);
    }

    public record ResultadoEdicion(ViajeDTO viaje, int pasajeros, int avisados) { }

    private String descripcionHorario(Viaje v) {
        return v.getFechaSalida() + " " + (v.getHoraSalida() != null
                ? v.getHoraSalida().toString().substring(0, 5) : "—")
                + " · " + v.getEmbarcacionNombre();
    }

    /**
     * Le avisa del cambio a quien dejó su correo.
     *
     * Un correo que no sale no puede tumbar la edición: la hora nueva ya está
     * guardada y es lo que importa para el embarque.
     */
    private int avisarPasajeros(Viaje v, List<Venta> ventas, String antes) {
        int enviados = 0;
        for (Venta venta : ventas) {
            String correo = venta.getClienteEmail();
            if (correo == null || correo.isBlank()) continue;
            try {
                emailService.enviarTexto(correo,
                        "Cambio de horario de tu viaje - Transportes Rayza",
                        "Hola " + venta.getPasajeroNombre() + ",\n\n"
                        + "Te avisamos que tu viaje " + v.getRutaNombre() + " cambió de horario.\n\n"
                        + "Antes: " + antes + "\n"
                        + "Ahora: " + descripcionHorario(v) + "\n\n"
                        + "Tu pasaje y tu asiento (" + venta.getAsientoTipo() + " #"
                        + venta.getAsientoNumero() + ") siguen siendo los mismos; solo cambia la hora.\n"
                        + "El embarque abre 2 horas antes de la salida.\n\n"
                        + "Disculpa las molestias.\nTransportes Rayza");
                enviados++;
            } catch (Exception e) {
                System.err.println("[Viaje] no se pudo avisar a " + correo + ": " + e.getMessage());
            }
        }
        return enviados;
    }

    private void copiarParadasDeLaRuta(Viaje v, String rutaId) {
        List<ViajeParada> paradas = rutaParadaRepository.findByRutaIdOrderByOrdenAsc(rutaId)
                .stream()
                .map(rp -> {
                    ViajeParada p = new ViajeParada();
                    p.setId(UUID.randomUUID().toString());
                    p.setViaje(v);
                    p.setNombre(rp.getNombre());
                    p.setOrden(rp.getOrden());
                    p.setMinutosDesdeSalida(rp.getMinutosDesdeSalida());
                    return p;
                })
                .collect(Collectors.toList());

        if (!paradas.isEmpty()) {
            viajeParadaRepository.saveAll(paradas);
            v.setParadas(paradas);
        }
    }

    private String generarCodigo(ViajeRequest req, String sucursalNombre, String embarcacionNombre) {
        // Formato: RR-E-20260618-1420-RAY-EMB
        // Incluye la embarcación para que dos viajes a la misma hora con distinta
        // embarcación no choquen (codigo_viaje es UNIQUE). Si aun así coincide, se
        // agrega un sufijo -2, -3, ... para garantizar unicidad.
        String fecha = req.getFechaSalida().toString().replace("-", "");
        String hora  = req.getHoraSalida().toString().replace(":", "").substring(0, 4);
        String suc   = slugCodigo(sucursalNombre);
        String emb   = slugCodigo(embarcacionNombre);
        String base  = "RR-E-" + fecha + "-" + hora + "-" + suc + "-" + emb;

        String codigo = base;
        int n = 2;
        while (viajeRepository.existsByCodigoViaje(codigo)) {
            codigo = base + "-" + n++;
        }
        return codigo;
    }

    /** Toma las primeras 3 letras/números (sin espacios ni acentos), en mayúscula. */
    private String slugCodigo(String s) {
        if (s == null) return "XXX";
        String limpio = s.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
        return limpio.isEmpty() ? "XXX" : limpio.substring(0, Math.min(3, limpio.length()));
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
        dto.setMotivoCancelacion(v.getMotivoCancelacion());
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