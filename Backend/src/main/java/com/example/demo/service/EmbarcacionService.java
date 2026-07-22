package com.example.demo.service;

import com.example.demo.dto.EmbarcacionDTO;
import com.example.demo.dto.EmbarcacionRequest;
import com.example.demo.dto.TripulanteDTO;
import com.example.demo.model.Embarcacion;
import com.example.demo.model.EmbarcacionAsiento;
import com.example.demo.model.EmbarcacionTripulante;
import com.example.demo.repository.EmbarcacionAsientoRepository;
import com.example.demo.repository.EmbarcacionRepository;
import com.example.demo.repository.EmbarcacionTripulanteRepository;
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
    private final EmbarcacionTripulanteRepository tripulanteRepository;

    public EmbarcacionService(EmbarcacionRepository embarcacionRepository,
                              EmbarcacionAsientoRepository asientoRepository,
                              EmbarcacionTripulanteRepository tripulanteRepository) {
        this.embarcacionRepository = embarcacionRepository;
        this.asientoRepository     = asientoRepository;
        this.tripulanteRepository  = tripulanteRepository;
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
        e.setVipPosicion(parseVipPosicion(req.getVipPosicion()));
        e.setCapitan(req.getCapitan());
        e.setActivo(req.getActivo() != null ? req.getActivo() : true);
        e.setCreatedAt(LocalDateTime.now());

        embarcacionRepository.save(e);
        generarAsientos(e);
        guardarTripulantes(e, req);

        return toDTO(e, true);
    }

    @Transactional
    public EmbarcacionDTO editar(String id, EmbarcacionRequest req) {
        Embarcacion e = embarcacionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Embarcación no encontrada"));

        // La numeración depende de las cantidades y de dónde esté la zona VIP
        boolean cambioDistribucion =
                !java.util.Objects.equals(e.getCantidadVip(), req.getCantidadVip()) ||
                !java.util.Objects.equals(e.getCantidadNormal(), req.getCantidadNormal()) ||
                e.getVipPosicion() != parseVipPosicion(req.getVipPosicion());

        e.setNombre(req.getNombre());
        e.setCantidadVip(req.getCantidadVip());
        e.setCantidadNormal(req.getCantidadNormal());
        e.setCapacidadTotal(req.getCantidadVip() + req.getCantidadNormal());
        e.setVipPosicion(parseVipPosicion(req.getVipPosicion()));
        e.setCapitan(req.getCapitan());
        if (req.getActivo() != null) e.setActivo(req.getActivo());

        // Regenerar asientos solo si cambió la cantidad VIP/Normal
        if (cambioDistribucion) {
            asientoRepository.deleteByEmbarcacionId(id);
            asientoRepository.flush(); // aplicar el borrado antes de reinsertar (uq_embarcacion_asiento)
            generarAsientos(e);
        }
        guardarTripulantes(e, req);

        return toDTO(embarcacionRepository.save(e), true);
    }

    // Posición del VIP; por defecto POPA (atrás), que es lo más común
    private Embarcacion.VipPosicion parseVipPosicion(String valor) {
        if (valor == null || valor.isBlank()) return Embarcacion.VipPosicion.POPA;
        try { return Embarcacion.VipPosicion.valueOf(valor); }
        catch (Exception ex) { return Embarcacion.VipPosicion.POPA; }
    }

    // Reemplaza la tripulación por la enviada en el request
    private void guardarTripulantes(Embarcacion e, EmbarcacionRequest req) {
        tripulanteRepository.deleteByEmbarcacionId(e.getId());
        tripulanteRepository.flush(); // aplicar el borrado antes de insertar los nuevos
        if (req.getTripulantes() == null) return;

        List<EmbarcacionTripulante> lista = new ArrayList<>();
        for (TripulanteDTO t : req.getTripulantes()) {
            if (t.getNombre() == null || t.getNombre().isBlank()) continue;
            EmbarcacionTripulante tr = new EmbarcacionTripulante();
            tr.setId(UUID.randomUUID().toString());
            tr.setEmbarcacion(e);
            tr.setNombre(t.getNombre().trim());
            tr.setCargo(t.getCargo() != null ? t.getCargo().trim() : null);
            lista.add(tr);
        }
        tripulanteRepository.saveAll(lista);
    }

    public void desactivar(String id) {
        Embarcacion e = embarcacionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Embarcación no encontrada"));
        e.setActivo(false);
        embarcacionRepository.save(e);
    }

    // Genera los asientos numerándolos en orden físico: se empieza por la proa
    // (adelante) y se avanza hacia la popa. Así, si el VIP está atrás, los
    // Normal llevan los primeros números y el VIP los últimos.
    private void generarAsientos(Embarcacion e) {
        List<EmbarcacionAsiento> asientos = new ArrayList<>();
        int numero = 1;

        boolean vipAdelante = e.getVipPosicion() == Embarcacion.VipPosicion.PROA;

        if (vipAdelante) {
            numero = agregarAsientos(e, asientos, numero, EmbarcacionAsiento.TipoAsiento.VIP,    e.getCantidadVip());
            agregarAsientos(e, asientos, numero, EmbarcacionAsiento.TipoAsiento.NORMAL, e.getCantidadNormal());
        } else {
            numero = agregarAsientos(e, asientos, numero, EmbarcacionAsiento.TipoAsiento.NORMAL, e.getCantidadNormal());
            agregarAsientos(e, asientos, numero, EmbarcacionAsiento.TipoAsiento.VIP,    e.getCantidadVip());
        }

        asientoRepository.saveAll(asientos);
    }

    // Agrega 'cantidad' asientos del tipo indicado y devuelve el siguiente número libre
    private int agregarAsientos(Embarcacion e, List<EmbarcacionAsiento> destino, int desde,
                                EmbarcacionAsiento.TipoAsiento tipo, Integer cantidad) {
        int numero = desde;
        int total = cantidad != null ? cantidad : 0;
        for (int i = 0; i < total; i++) {
            EmbarcacionAsiento a = new EmbarcacionAsiento();
            a.setId(UUID.randomUUID().toString());
            a.setEmbarcacion(e);
            a.setNumero(numero++);
            a.setTipo(tipo);
            destino.add(a);
        }
        return numero;
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
        dto.setVipPosicion(e.getVipPosicion() != null ? e.getVipPosicion().name() : "POPA");
        dto.setCapitan(e.getCapitan());
        dto.setActivo(e.getActivo());
        dto.setCreatedAt(e.getCreatedAt() != null ? e.getCreatedAt().toString() : null);

        dto.setTripulantes(tripulanteRepository.findByEmbarcacionId(e.getId())
                .stream()
                .map(t -> new TripulanteDTO(t.getId(), t.getNombre(), t.getCargo()))
                .collect(Collectors.toList()));

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