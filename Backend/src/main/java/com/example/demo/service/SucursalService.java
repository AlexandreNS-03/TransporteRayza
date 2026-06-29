package com.example.demo.service;

import com.example.demo.dto.SucursalDTO;
import com.example.demo.dto.SucursalRequest;
import com.example.demo.model.Sucursal;
import com.example.demo.repository.SucursalRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class SucursalService {

    private final SucursalRepository sucursalRepository;

    public SucursalService(SucursalRepository sucursalRepository) {
        this.sucursalRepository = sucursalRepository;
    }

    // Listar todas
    public List<SucursalDTO> listarTodas() {
        return sucursalRepository.findAllByOrderByNombreAsc()
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // Listar solo activas (para selects en formularios)
    public List<SucursalDTO> listarActivas() {
        return sucursalRepository.findByActivoTrue()
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // Obtener por id
    public SucursalDTO obtener(String id) {
        return sucursalRepository.findById(id)
                .map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Sucursal no encontrada"));
    }

    // Crear
    public SucursalDTO crear(SucursalRequest req) {
        Sucursal s = new Sucursal();
        s.setId(generarId(req.getCiudad()));
        s.setNombre(req.getNombre());
        s.setDireccion(req.getDireccion());
        s.setCiudad(req.getCiudad());
        s.setTelefono(req.getTelefono());
        s.setActivo(req.getActivo() != null ? req.getActivo() : true);
        s.setCreatedAt(LocalDateTime.now());
        return toDTO(sucursalRepository.save(s));
    }

    private String generarId(String ciudad) {

        String normalizada = ciudad.toLowerCase().trim()
                .replace("á","a").replace("é","e").replace("í","i")
                .replace("ó","o").replace("ú","u").replace("ñ","n");

        String[] palabras = normalizada.split("\\s+");
        String abr;

        if (palabras.length >= 2) {
            String p1 = palabras[0].replaceAll("[^a-z]", "");
            String p2 = palabras[1].replaceAll("[^a-z]", "");
            abr = p1.substring(0, Math.min(2, p1.length()))
                    + p2.substring(0, Math.min(3, p2.length()));
        } else {
            String p1 = palabras[0].replaceAll("[^a-z]", "");
            abr = p1.substring(0, Math.min(3, p1.length()));
        }

        String idBase = "suc_" + abr;

        if (!sucursalRepository.existsById(idBase)) {
            return idBase;
        }

        int contador = 2;
        while (sucursalRepository.existsById(idBase + "_" + contador)) {
            contador++;
        }
        return idBase + "_" + contador;
    }

    // Editar
    public SucursalDTO editar(String id, SucursalRequest req) {
        Sucursal s = sucursalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sucursal no encontrada"));
        s.setNombre(req.getNombre());
        s.setDireccion(req.getDireccion());
        s.setCiudad(req.getCiudad());
        s.setTelefono(req.getTelefono());
        if (req.getActivo() != null) s.setActivo(req.getActivo());
        return toDTO(sucursalRepository.save(s));
    }

    // Desactivar (no eliminamos físicamente)
    public void desactivar(String id) {
        Sucursal s = sucursalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sucursal no encontrada"));
        s.setActivo(false);
        sucursalRepository.save(s);
    }

    private SucursalDTO toDTO(Sucursal s) {
        SucursalDTO dto = new SucursalDTO();
        dto.setId(s.getId());
        dto.setNombre(s.getNombre());
        dto.setDireccion(s.getDireccion());
        dto.setCiudad(s.getCiudad());
        dto.setTelefono(s.getTelefono());
        dto.setActivo(s.getActivo());
        dto.setCreatedAt(s.getCreatedAt() != null ? s.getCreatedAt().toString() : null);
        return dto;
    }
}