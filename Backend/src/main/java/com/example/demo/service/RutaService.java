package com.example.demo.service;

import com.example.demo.dto.RutaDTO;
import com.example.demo.dto.RutaRequest;
import com.example.demo.model.Ruta;
import com.example.demo.model.RutaParada;
import com.example.demo.model.RutaTarifaTramo;
import com.example.demo.repository.RutaParadaRepository;
import com.example.demo.repository.RutaRepository;
import com.example.demo.repository.RutaTarifaTramoRepository;
import com.example.demo.repository.SucursalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RutaService {

    private final RutaRepository rutaRepository;
    private final RutaParadaRepository paradaRepository;
    private final RutaTarifaTramoRepository tarifaRepository;
    private final SucursalRepository sucursalRepository;

    public RutaService(RutaRepository rutaRepository,
                       RutaParadaRepository paradaRepository,
                       RutaTarifaTramoRepository tarifaRepository,
                       SucursalRepository sucursalRepository) {
        this.rutaRepository    = rutaRepository;
        this.paradaRepository  = paradaRepository;
        this.tarifaRepository  = tarifaRepository;
        this.sucursalRepository = sucursalRepository;
    }

    public List<RutaDTO> listarTodas() {
        return rutaRepository.findAllByOrderByOrigenAsc()
                .stream().map(r -> toDTO(r, false)).collect(Collectors.toList());
    }

    public List<RutaDTO> listarActivas() {
        return rutaRepository.findByActivoTrue()
                .stream().map(r -> toDTO(r, false)).collect(Collectors.toList());
    }

    public RutaDTO obtener(String id) {
        Ruta r = rutaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ruta no encontrada"));
        return toDTO(r, true);
    }

    @Transactional
    public RutaDTO crear(RutaRequest req) {
        var sucursal = sucursalRepository.findById(req.getSucursalAdministradoraId())
                .orElseThrow(() -> new RuntimeException("Sucursal no encontrada"));

        Ruta r = new Ruta();
        r.setId(generarId(req.getOrigen(), req.getDestino()));
        r.setOrigen(req.getOrigen());
        r.setDestino(req.getDestino());
        r.setSucursalAdministradoraId(sucursal.getId());
        r.setSucursalAdministradoraNombre(sucursal.getNombre());
        r.setPrecioNormal(req.getPrecioNormal());
        r.setPrecioVip(req.getPrecioVip());
        r.setDuracionAproximada(req.getDuracionAproximada());
        r.setActivo(req.getActivo() != null ? req.getActivo() : true);
        r.setCreatedAt(LocalDateTime.now());
        rutaRepository.save(r);

        guardarParadas(r, req);
        guardarTarifas(r, req);

        return toDTO(r, true);
    }

    @Transactional
    public RutaDTO editar(String id, RutaRequest req) {
        Ruta r = rutaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ruta no encontrada"));

        var sucursal = sucursalRepository.findById(req.getSucursalAdministradoraId())
                .orElseThrow(() -> new RuntimeException("Sucursal no encontrada"));

        r.setOrigen(req.getOrigen());
        r.setDestino(req.getDestino());
        r.setSucursalAdministradoraId(sucursal.getId());
        r.setSucursalAdministradoraNombre(sucursal.getNombre());
        r.setPrecioNormal(req.getPrecioNormal());
        r.setPrecioVip(req.getPrecioVip());
        r.setDuracionAproximada(req.getDuracionAproximada());
        if (req.getActivo() != null) r.setActivo(req.getActivo());
        rutaRepository.save(r);

        paradaRepository.deleteByRutaId(id);
        tarifaRepository.deleteByRutaId(id);
        guardarParadas(r, req);
        guardarTarifas(r, req);

        return toDTO(r, true);
    }

    public void desactivar(String id) {
        Ruta r = rutaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ruta no encontrada"));
        r.setActivo(false);
        rutaRepository.save(r);
    }

    private void guardarParadas(Ruta r, RutaRequest req) {
        if (req.getParadas() == null) return;
        List<RutaParada> paradas = req.getParadas().stream().map(p -> {
            RutaParada rp = new RutaParada();
            rp.setId(UUID.randomUUID().toString());
            rp.setRuta(r);
            rp.setNombre(p.getNombre());
            rp.setOrden(p.getOrden());
            return rp;
        }).collect(Collectors.toList());
        paradaRepository.saveAll(paradas);
    }

    private void guardarTarifas(Ruta r, RutaRequest req) {
        if (req.getTarifas() == null) return;
        List<RutaTarifaTramo> tarifas = req.getTarifas().stream().map(t -> {
            RutaTarifaTramo rt = new RutaTarifaTramo();
            rt.setId(UUID.randomUUID().toString());
            rt.setRuta(r);
            rt.setOrigenTramo(t.getOrigenTramo());
            rt.setDestinoTramo(t.getDestinoTramo());
            rt.setOrdenOrigen(t.getOrdenOrigen());
            rt.setOrdenDestino(t.getOrdenDestino());
            rt.setPrecioNormal(t.getPrecioNormal());
            rt.setPrecioVip(t.getPrecioVip());
            return rt;
        }).collect(Collectors.toList());
        tarifaRepository.saveAll(tarifas);
    }

    private String generarId(String origen, String destino) {
        String o = origen.toLowerCase().trim()
                .replace("á","a").replace("é","e").replace("í","i")
                .replace("ó","o").replace("ú","u").replace("ñ","n")
                .replaceAll("[^a-z]", "").substring(0, Math.min(3, origen.length()));

        String d = destino.toLowerCase().trim()
                .replace("á","a").replace("é","e").replace("í","i")
                .replace("ó","o").replace("ú","u").replace("ñ","n")
                .replaceAll("[^a-z]", "").substring(0, Math.min(3, destino.length()));

        String idBase = "rut_" + o + "_" + d;

        if (!rutaRepository.existsById(idBase)) return idBase;

        int contador = 2;
        while (rutaRepository.existsById(idBase + "_" + contador)) contador++;
        return idBase + "_" + contador;
    }

    public Map<String, Object> obtenerTarifa(String rutaId, int ordenOrigen, int ordenDestino) {
        return tarifaRepository.findByRutaId(rutaId).stream()
                .filter(t -> t.getOrdenOrigen() == ordenOrigen && t.getOrdenDestino() == ordenDestino)
                .findFirst()
                .map(t -> {
                    Map<String, Object> result = new HashMap<>();
                    result.put("precioNormal", t.getPrecioNormal());
                    result.put("precioVip", t.getPrecioVip());
                    return result;
                })
                .orElseThrow(() -> new RuntimeException("Tarifa no encontrada para ese tramo"));
    }

    private RutaDTO toDTO(Ruta r, boolean conDetalle) {
        RutaDTO dto = new RutaDTO();
        dto.setId(r.getId());
        dto.setOrigen(r.getOrigen());
        dto.setDestino(r.getDestino());
        dto.setSucursalAdministradoraId(r.getSucursalAdministradoraId());
        dto.setSucursalAdministradoraNombre(r.getSucursalAdministradoraNombre());
        dto.setPrecioNormal(r.getPrecioNormal());
        dto.setPrecioVip(r.getPrecioVip());
        dto.setDuracionAproximada(r.getDuracionAproximada());
        dto.setActivo(r.getActivo());
        dto.setCreatedAt(r.getCreatedAt() != null ? r.getCreatedAt().toString() : null);

        if (conDetalle) {
            if (r.getParadas() != null) {
                dto.setParadas(r.getParadas().stream()
                        .map(p -> new RutaDTO.ParadaDTO(p.getId(), p.getNombre(), p.getOrden()))
                        .collect(Collectors.toList()));
            }
            if (r.getTarifas() != null) {
                dto.setTarifas(r.getTarifas().stream()
                        .map(t -> new RutaDTO.TarifaTramoDTO(
                                t.getId(), t.getOrigenTramo(), t.getDestinoTramo(),
                                t.getOrdenOrigen(), t.getOrdenDestino(),
                                t.getPrecioNormal(), t.getPrecioVip()))
                        .collect(Collectors.toList()));
            }
        }

        return dto;
    }
}