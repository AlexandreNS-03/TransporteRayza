package com.example.demo.service;

import com.example.demo.dto.EmbarcacionDTO;
import com.example.demo.dto.EmbarcacionRequest;
import com.example.demo.model.Embarcacion;
import com.example.demo.model.EmbarcacionAsiento;
import com.example.demo.repository.EmbarcacionAsientoRepository;
import com.example.demo.repository.EmbarcacionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class EmbarcacionService {

    private final EmbarcacionRepository embarcacionRepository;
    private final EmbarcacionAsientoRepository asientoRepository;

    public EmbarcacionService(EmbarcacionRepository embarcacionRepository,
                              EmbarcacionAsientoRepository asientoRepository) {
        this.embarcacionRepository = embarcacionRepository;
        this.asientoRepository     = asientoRepository;
    }

    public List<EmbarcacionDTO> listarTodas() {
        return embarcacionRepository.findAllByOrderByNombreAsc()
                .stream().map(e -> toDTO(e, false)).collect(Collectors.toList());
    }

    public List<EmbarcacionDTO> listarActivas() {
        return embarcacionRepository.findByActivoTrue()
                .stream().map(e -> toDTO(e, false)).collect(Collectors.toList());
    }

    public EmbarcacionDTO obtener(String id) {
        Embarcacion e = embarcacionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Embarcación no encontrada"));
        return toDTO(e, true); // con asientos
    }

    @Transactional
    public EmbarcacionDTO crear(EmbarcacionRequest req) {
        if (embarcacionRepository.existsByCodigo(req.getCodigo()))
            throw new RuntimeException("Ya existe una embarcación con ese código");

        Embarcacion e = new Embarcacion();
        e.setId(generarId(req.getNombre()));
        e.setNombre(req.getNombre());
        e.setCodigo(req.getCodigo());
        e.setCantidadVip(req.getCantidadVip());
        e.setCantidadNormal(req.getCantidadNormal());
        e.setCapacidadTotal(req.getCantidadVip() + req.getCantidadNormal());
        e.setActivo(req.getActivo() != null ? req.getActivo() : true);
        e.setCreatedAt(LocalDateTime.now());

        embarcacionRepository.save(e);
        generarAsientos(e);

        return toDTO(e, true);
    }

    @Transactional
    public EmbarcacionDTO editar(String id, EmbarcacionRequest req) {
        Embarcacion e = embarcacionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Embarcación no encontrada"));

        e.setNombre(req.getNombre());
        e.setCantidadVip(req.getCantidadVip());
        e.setCantidadNormal(req.getCantidadNormal());
        e.setCapacidadTotal(req.getCantidadVip() + req.getCantidadNormal());
        if (req.getActivo() != null) e.setActivo(req.getActivo());

        // Regenerar asientos si cambió la cantidad
        asientoRepository.deleteByEmbarcacionId(id);
        generarAsientos(e);

        return toDTO(embarcacionRepository.save(e), true);
    }

    public void desactivar(String id) {
        Embarcacion e = embarcacionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Embarcación no encontrada"));
        e.setActivo(false);
        embarcacionRepository.save(e);
    }

    // Genera los asientos automáticamente al crear
    private void generarAsientos(Embarcacion e) {
        List<EmbarcacionAsiento> asientos = new ArrayList<>();
        int numero = 1;

        // Primero los VIP
        for (int i = 0; i < e.getCantidadVip(); i++) {
            EmbarcacionAsiento a = new EmbarcacionAsiento();
            a.setId(UUID.randomUUID().toString());
            a.setEmbarcacion(e);
            a.setNumero(numero++);
            a.setTipo(EmbarcacionAsiento.TipoAsiento.VIP);
            asientos.add(a);
        }

        // Luego los NORMAL
        for (int i = 0; i < e.getCantidadNormal(); i++) {
            EmbarcacionAsiento a = new EmbarcacionAsiento();
            a.setId(UUID.randomUUID().toString());
            a.setEmbarcacion(e);
            a.setNumero(numero++);
            a.setTipo(EmbarcacionAsiento.TipoAsiento.NORMAL);
            asientos.add(a);
        }

        asientoRepository.saveAll(asientos);
    }

    private String generarId(String nombre) {
        String normalizada = nombre.toLowerCase().trim()
                .replace("á","a").replace("é","e").replace("í","i")
                .replace("ó","o").replace("ú","u").replace("ñ","n");

        System.out.println("Normalizada: '" + normalizada + "'");  // ← debug

        String[] palabras = normalizada.split("\\s+");

        System.out.println("Cantidad palabras: " + palabras.length);  // ← debug
        for (String p : palabras) {
            System.out.println("Palabra: '" + p + "'");  // ← debug
        }

        String abr;

        if (palabras.length >= 2) {
            String p1 = palabras[0].replaceAll("[^a-z0-9]", "");
            String p2 = palabras[1].replaceAll("[^a-z0-9]", "");
            abr = p1.substring(0, Math.min(3, p1.length()))
                    + p2.substring(0, Math.min(3, p2.length()));
        } else {
            String p1 = palabras[0].replaceAll("[^a-z0-9]", "");
            abr = p1.substring(0, Math.min(3, p1.length()));
        }

        String idBase = "emb_" + abr;

        if (!embarcacionRepository.existsById(idBase)) {
            return idBase;
        }

        int contador = 2;
        while (embarcacionRepository.existsById(idBase + "_" + contador)) {
            contador++;
        }
        return idBase + "_" + contador;
    }

    private EmbarcacionDTO toDTO(Embarcacion e, boolean conAsientos) {
        EmbarcacionDTO dto = new EmbarcacionDTO();
        dto.setId(e.getId());
        dto.setNombre(e.getNombre());
        dto.setCodigo(e.getCodigo());
        dto.setCantidadVip(e.getCantidadVip());
        dto.setCantidadNormal(e.getCantidadNormal());
        dto.setCapacidadTotal(e.getCapacidadTotal());
        dto.setActivo(e.getActivo());
        dto.setCreatedAt(e.getCreatedAt() != null ? e.getCreatedAt().toString() : null);

        if (conAsientos) {
            List<EmbarcacionDTO.AsientoDTO> asientos = asientoRepository
                    .findByEmbarcacionIdOrderByNumeroAsc(e.getId())
                    .stream()
                    .map(a -> new EmbarcacionDTO.AsientoDTO(
                            a.getId(),
                            a.getNumero(),
                            a.getTipo().name()))
                    .collect(Collectors.toList());
            dto.setAsientos(asientos);
        }

        return dto;
    }
}