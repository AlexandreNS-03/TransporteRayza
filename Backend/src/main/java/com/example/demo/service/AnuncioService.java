package com.example.demo.service;

import com.example.demo.dto.AnuncioDTO;
import com.example.demo.dto.AnuncioRequest;
import com.example.demo.model.Anuncio;
import com.example.demo.repository.AnuncioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AnuncioService {

    private final AnuncioRepository anuncioRepository;
    private final AuditoriaService auditoriaService;

    public AnuncioService(AnuncioRepository anuncioRepository,
                              AuditoriaService auditoriaService) {
        this.anuncioRepository = anuncioRepository;
        this.auditoriaService = auditoriaService;
    }

    public List<AnuncioDTO> listarTodos() {
        return anuncioRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    /**
     * Anuncios activos de un tipo, vigentes hoy. Sin fecha_inicio/fecha_fin el
     * anuncio no tiene límite de fechas (queda activo mientras `activo` sea true).
     */
    public List<AnuncioDTO> listarActivosPorTipo(Anuncio.Tipo tipo) {
        LocalDate hoy = LocalDate.now();
        return anuncioRepository.findByTipoAndActivoTrue(tipo).stream()
                .filter(a -> a.getFechaInicio() == null || !hoy.isBefore(a.getFechaInicio()))
                .filter(a -> a.getFechaFin() == null || !hoy.isAfter(a.getFechaFin()))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public AnuncioDTO crear(AnuncioRequest req) {
        Anuncio a = new Anuncio();
        a.setId(UUID.randomUUID().toString());
        aplicar(a, req);
        a.setCreatedAt(java.time.LocalDateTime.now());
        anuncioRepository.save(a);
        auditoriaService.registrar("CREAR", "ANUNCIOS", a.getId(),
                "Anuncio " + a.getTipo() + " publicado: " + recorte(a.getMensaje()));
        return toDTO(a);
    }

    @Transactional
    public AnuncioDTO editar(String id, AnuncioRequest req) {
        Anuncio a = anuncioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Anuncio no encontrado"));
        aplicar(a, req);
        anuncioRepository.save(a);
        auditoriaService.registrar("EDITAR", "ANUNCIOS", a.getId(),
                "Anuncio " + a.getTipo() + ": " + recorte(a.getMensaje()));
        return toDTO(a);
    }

    @Transactional
    /** El mensaje entero no entra en un renglón de auditoría; su principio sí. */
    private static String recorte(String t) {
        if (t == null) return "(sin texto)";
        String limpio = t.replaceAll("\\s+", " ").trim();
        return limpio.length() > 90 ? limpio.substring(0, 90) + "…" : limpio;
    }

    public void eliminar(String id) {
        if (!anuncioRepository.existsById(id))
            throw new RuntimeException("Anuncio no encontrado");
        anuncioRepository.deleteById(id);
    }

    private void aplicar(Anuncio a, AnuncioRequest req) {
        if (req.getTitulo() == null || req.getTitulo().isBlank())
            throw new RuntimeException("El título es obligatorio");
        if (req.getMensaje() == null || req.getMensaje().isBlank())
            throw new RuntimeException("El mensaje es obligatorio");
        if (req.getTipo() == null)
            throw new RuntimeException("Elige el tipo de anuncio (barra, modal o landing)");

        a.setTitulo(req.getTitulo().trim());
        a.setMensaje(req.getMensaje().trim());
        try {
            a.setTipo(Anuncio.Tipo.valueOf(req.getTipo()));
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Tipo de anuncio inválido: " + req.getTipo());
        }
        a.setTextoEnlace(vacioComoNull(req.getTextoEnlace()));
        a.setUrlEnlace(vacioComoNull(req.getUrlEnlace()));
        a.setActivo(req.getActivo() != null ? req.getActivo() : true);
        a.setFechaInicio(req.getFechaInicio() != null && !req.getFechaInicio().isBlank()
                ? LocalDate.parse(req.getFechaInicio()) : null);
        a.setFechaFin(req.getFechaFin() != null && !req.getFechaFin().isBlank()
                ? LocalDate.parse(req.getFechaFin()) : null);
    }

    private String vacioComoNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private AnuncioDTO toDTO(Anuncio a) {
        AnuncioDTO dto = new AnuncioDTO();
        dto.setId(a.getId());
        dto.setTitulo(a.getTitulo());
        dto.setMensaje(a.getMensaje());
        dto.setTipo(a.getTipo() != null ? a.getTipo().name() : null);
        dto.setTextoEnlace(a.getTextoEnlace());
        dto.setUrlEnlace(a.getUrlEnlace());
        dto.setActivo(a.getActivo());
        dto.setFechaInicio(a.getFechaInicio() != null ? a.getFechaInicio().toString() : null);
        dto.setFechaFin(a.getFechaFin() != null ? a.getFechaFin().toString() : null);
        return dto;
    }
}
