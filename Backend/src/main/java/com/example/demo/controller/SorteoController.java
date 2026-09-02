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

    /**
     * Quiénes participan, para pintar la rueda.
     *
     * Va el nombre recortado y el código —los dos ya se muestran en público
     * cuando alguien gana—, nunca el correo ni el documento. El orden es el de
     * registro y no cambia: la rueda frena sobre el sector del ganador y eso
     * solo cuadra si la lista es siempre la misma.
     */
    @GetMapping("/api/public/sorteo/{id}/participantes")
    public ResponseEntity<List<Map<String, Object>>> participantes(@PathVariable String id) {
        return ResponseEntity.ok(cuponRepository.participantesDe(id).stream()
                .map(c -> Map.<String, Object>of(
                        "codigo", c.getCodigo(),
                        "nombre", SorteoVivoService.nombreCorto(c.getPasajeroNombre()),
                        "vip", c.getPeso() != null && c.getPeso() > 1))
                .toList());
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
        Sorteo guardado = sorteoRepository.save(s);

        // Los premios, si vinieron varios. El campo `premio` del sorteo se queda
        // con el mayor para que las pantallas y el historial de siempre lo lean.
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> premios = body.get("premios") instanceof List<?> l
                ? (List<Map<String, Object>>) l : List.of();
        if (!premios.isEmpty()) {
            servicio.guardarPremios(guardado.getId(), premios);
            var mayor = premios.get(0);
            if (mayor.get("descripcion") != null) guardado.setPremio(texto(mayor.get("descripcion")));
            if (mayor.get("valor") != null && !mayor.get("valor").toString().isBlank())
                guardado.setPremioValor(new java.math.BigDecimal(mayor.get("valor").toString()));
            sorteoRepository.save(guardado);
        }
        return ResponseEntity.ok(aMapaAdmin(guardado));
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

    /** Emite los códigos que hayan quedado sin generar desde que se abrió. */
    @PostMapping("/api/sorteos/{id}/emitir-faltantes")
    public ResponseEntity<?> emitirFaltantes(@PathVariable String id) {
        Map<String, Integer> r = servicio.emitirFaltantes(id);
        int n = r.get("total");
        return ResponseEntity.ok(Map.of(
                "emitidos", n,
                "web", r.get("web"),
                "mostrador", r.get("mostrador"),
                "message", n == 0
                        ? "No faltaba ningún código: todos los pasajes vendidos desde que abriste el sorteo ya tienen el suyo."
                        : n + (n == 1 ? " código emitido" : " códigos emitidos")
                          + " (" + r.get("mostrador") + " de mostrador, " + r.get("web") + " de la web)."
                          + " Vuelve a imprimir esos tickets para que salgan con el código."));
    }

    /**
     * Sortea el siguiente premio pendiente. Una sola vez cada uno.
     *
     * Devuelve el sorteo completo más el premio que acaba de salir, que es lo
     * que la pantalla anuncia antes de ofrecer el siguiente giro.
     */
    @PostMapping("/api/sorteos/{id}/ejecutar")
    public ResponseEntity<?> ejecutar(@PathVariable String id, Authentication auth) {
        var premio = servicio.ejecutar(id, auth.getName());
        Sorteo s = sorteoRepository.findById(id).orElseThrow();

        java.util.HashMap<String, Object> r = new java.util.HashMap<>(aMapaAdmin(s));
        r.put("premioSorteado", premioComoMapa(premio, true));
        r.put("quedanPremios", servicio.premiosDe(s).stream().anyMatch(p -> !p.estaSorteado()));
        return ResponseEntity.ok(r);
    }

    /**
     * Un premio para mostrar. Con `conGanador` va también quién lo ganó; en la
     * web solo se muestra el nombre recortado, nunca el documento ni el correo.
     */
    private Map<String, Object> premioComoMapa(com.example.demo.model.PremioSorteo p, boolean detalle) {
        java.util.HashMap<String, Object> m = new java.util.HashMap<>();
        m.put("orden", p.getOrden());
        m.put("descripcion", p.getDescripcion());
        m.put("valor", p.getValor());
        m.put("sorteado", p.estaSorteado());
        m.put("sorteadoAt", p.getSorteadoAt() != null ? p.getSorteadoAt().toString() : null);
        if (p.getCuponGanadorId() != null)
            cuponRepository.findById(p.getCuponGanadorId()).ifPresent(g -> {
                m.put("ganadorNombre", SorteoVivoService.nombreCorto(g.getPasajeroNombre()));
                m.put("ganadorCodigo", g.getCodigo());
                if (detalle) {
                    m.put("ganadorNombreCompleto", g.getPasajeroNombre());
                    m.put("ganadorDocumento", g.getPasajeroDocumento());
                    m.put("ganadorEmail", g.getEmail());
                    m.put("ganadorTelefono", g.getTelefono());
                }
            });
        return m;
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

        // Los premios, con su ganador si ya salió: es lo que la página va
        // anunciando giro a giro y lo que queda como registro.
        m.put("premios", servicio.premiosDe(s).stream().map(p -> premioComoMapa(p, false)).toList());

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
        // Al personal le van los datos para ubicar a cada ganador y entregarle.
        m.put("premios", servicio.premiosDe(s).stream().map(p -> premioComoMapa(p, true)).toList());
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
