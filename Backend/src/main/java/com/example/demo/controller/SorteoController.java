package com.example.demo.controller;

import com.example.demo.model.CuponSorteo;
import com.example.demo.model.Sorteo;
import com.example.demo.repository.CuponSorteoRepository;
import com.example.demo.repository.SorteoRepository;
import com.example.demo.service.SorteoService;
import com.example.demo.service.SorteoVivoService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Sorteo promocional.
 *
 * Lo público —ver el sorteo, registrar un código, mirar en vivo— cuelga de
 * /api/public: participar no puede exigir cuenta. Crear y ejecutar es del
 * personal.
 */
@RestController
public class SorteoController {

    private final SorteoService servicio;
    private final SorteoVivoService vivo;
    private final SorteoRepository sorteoRepository;
    private final CuponSorteoRepository cuponRepository;

    public SorteoController(SorteoService servicio, SorteoVivoService vivo,
                            SorteoRepository sorteoRepository,
                            CuponSorteoRepository cuponRepository) {
        this.servicio = servicio;
        this.vivo = vivo;
        this.sorteoRepository = sorteoRepository;
        this.cuponRepository = cuponRepository;
    }

    // ---------------------------------------------------------- Público

    /** El sorteo vigente y su estado, para la página del cliente. */
    @GetMapping("/api/public/sorteo")
    public ResponseEntity<?> vigente() {
        Sorteo s = sorteoRepository.findFirstByEstado(Sorteo.Estado.ABIERTO)
                .or(() -> sorteoRepository.findFirstByEstado(Sorteo.Estado.CERRADO))
                .or(() -> sorteoRepository.findFirstByEstado(Sorteo.Estado.SORTEADO))
                .orElse(null);
        if (s == null) return ResponseEntity.ok(Map.of("hay", false));
        return ResponseEntity.ok(aMapaPublico(s));
    }

    /**
     * Los sorteos ya realizados, con su ganador.
     *
     * Es público a propósito: que cualquiera pueda ver quién ganó, cuándo y entre
     * cuántos es lo que sostiene que el sorteo fue limpio. Sin este registro, la
     * única prueba sería la palabra de la empresa.
     */
    @GetMapping("/api/public/sorteos/historial")
    public ResponseEntity<List<Map<String, Object>>> historial() {
        return ResponseEntity.ok(
                sorteoRepository.findByEstadoOrderBySorteadoAtDesc(Sorteo.Estado.SORTEADO)
                        .stream().map(this::aMapaPublico).toList());
    }

    /** Registra el código impreso en el ticket. */
    @PostMapping("/api/public/sorteo/registrar")
    public ResponseEntity<?> registrar(@RequestBody Map<String, String> body) {
        CuponSorteo c = servicio.registrar(body.get("codigo"), body.get("email"), body.get("telefono"));
        return ResponseEntity.ok(Map.of(
                "codigo", c.getCodigo(),
                "nombre", c.getPasajeroNombre() != null ? c.getPasajeroNombre() : "",
                "oportunidades", c.getPeso(),
                "message", c.getPeso() != null && c.getPeso() > 1
                        ? "¡Listo! Tu asiento VIP te da el doble de oportunidades."
                        : "¡Listo! Ya estás participando."));
    }

    /**
     * Transmisión del sorteo en vivo.
     *
     * Se responde como text/event-stream: el navegador lo consume con
     * EventSource y se reconecta solo si se corta.
     */
    @GetMapping(value = "/api/public/sorteo/{id}/vivo", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter vivo(@PathVariable String id) {
        return vivo.conectar(id);
    }

    // ---------------------------------------------------------- Personal

    @GetMapping("/api/sorteos")
    public ResponseEntity<List<Map<String, Object>>> listar() {
        return ResponseEntity.ok(sorteoRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(this::aMapaAdmin).toList());
    }

    @PostMapping("/api/sorteos")
    public ResponseEntity<?> crear(@RequestBody Map<String, Object> body) {
        // Uno abierto a la vez: con dos, un pasaje no sabría a cuál pertenece su
        // código y el ticket saldría con un cupón ambiguo.
        if (sorteoRepository.findFirstByEstado(Sorteo.Estado.ABIERTO).isPresent())
            return ResponseEntity.badRequest().body(Map.of("message",
                    "Ya hay un sorteo abierto. Ciérralo antes de crear otro."));

        Sorteo s = new Sorteo();
        s.setId(UUID.randomUUID().toString());
        s.setNombre(texto(body.get("nombre")));
        s.setPremio(texto(body.get("premio")));
        s.setBasesUrl(texto(body.get("basesUrl")));
        if (body.get("premioValor") != null)
            s.setPremioValor(new java.math.BigDecimal(body.get("premioValor").toString()));
        if (body.get("fechaSorteo") != null && !body.get("fechaSorteo").toString().isBlank())
            s.setFechaSorteo(LocalDateTime.parse(body.get("fechaSorteo").toString()));
        s.setEstado(Sorteo.Estado.ABIERTO);
        s.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.ok(aMapaAdmin(sorteoRepository.save(s)));
    }

    /** Cierra el registro. Después de esto ya no entran más cupones. */
    @PatchMapping("/api/sorteos/{id}/cerrar")
    public ResponseEntity<?> cerrar(@PathVariable String id) {
        Sorteo s = sorteoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ese sorteo no existe"));
        if (s.getEstado() == Sorteo.Estado.SORTEADO)
            return ResponseEntity.badRequest().body(Map.of("message", "Ese sorteo ya se realizó."));
        s.setEstado(Sorteo.Estado.CERRADO);
        return ResponseEntity.ok(aMapaAdmin(sorteoRepository.save(s)));
    }

    /** Elige al ganador. Una sola vez. */
    @PostMapping("/api/sorteos/{id}/ejecutar")
    public ResponseEntity<?> ejecutar(@PathVariable String id, Authentication auth) {
        return ResponseEntity.ok(aMapaAdmin(servicio.ejecutar(id, auth.getName())));
    }

    // ---------------------------------------------------------- Armado

    private Map<String, Object> aMapaPublico(Sorteo s) {
        java.util.HashMap<String, Object> m = new java.util.HashMap<>();
        m.put("hay", true);
        m.put("id", s.getId());
        m.put("nombre", s.getNombre());
        m.put("premio", s.getPremio());
        m.put("basesUrl", s.getBasesUrl());
        m.put("estado", s.getEstado().name());
        m.put("fechaSorteo", s.getFechaSorteo() != null ? s.getFechaSorteo().toString() : null);
        // Ya sorteado, vale la cifra congelada al momento del sorteo: si se
        // recontara, el historial cambiaría cada vez que alguien registra un
        // código, y entonces no probaría nada.
        m.put("participantes",
                s.getEstado() == Sorteo.Estado.SORTEADO && s.getCuponesParticipantes() != null
                        ? s.getCuponesParticipantes()
                        : cuponRepository.participantesDe(s.getId()).size());

        // El ganador solo después de sortear, y sin datos personales de más.
        if (s.getEstado() == Sorteo.Estado.SORTEADO && s.getCuponGanadorId() != null) {
            cuponRepository.findById(s.getCuponGanadorId()).ifPresent(g -> {
                m.put("ganadorNombre", SorteoVivoService.nombreCorto(g.getPasajeroNombre()));
                m.put("ganadorCodigo", g.getCodigo());
            });
            // La fecha y el valor van en el historial público: son parte de lo que
            // permite comprobar que el sorteo se hizo cuando se dijo.
            m.put("sorteadoAt", s.getSorteadoAt() != null ? s.getSorteadoAt().toString() : null);
            m.put("premioValor", s.getPremioValor());
        }
        return m;
    }

    private Map<String, Object> aMapaAdmin(Sorteo s) {
        java.util.HashMap<String, Object> m = new java.util.HashMap<>(aMapaPublico(s));
        m.put("cupones", cuponRepository.countBySorteoId(s.getId()));
        m.put("viendoAhora", vivo.viendo(s.getId()));
        m.put("sorteadoAt", s.getSorteadoAt() != null ? s.getSorteadoAt().toString() : null);
        m.put("sorteadoPor", s.getSorteadoPor());
        m.put("premioValor", s.getPremioValor());
        // El personal sí necesita cómo ubicar al ganador para entregarle el premio.
        if (s.getCuponGanadorId() != null)
            cuponRepository.findById(s.getCuponGanadorId()).ifPresent(g -> {
                m.put("ganadorNombreCompleto", g.getPasajeroNombre());
                m.put("ganadorEmail", g.getEmail());
                m.put("ganadorTelefono", g.getTelefono());
                m.put("ganadorDocumento", g.getPasajeroDocumento());
            });
        return m;
    }

    private String texto(Object o) { return o == null ? null : o.toString().trim(); }
}
