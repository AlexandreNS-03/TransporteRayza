package com.example.demo.service;

import com.example.demo.dto.AsientoDTO;
import com.example.demo.model.*;
import com.example.demo.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AsientoService {

    private final ViajeAsientoEstadoRepository asientoEstadoRepo;
    private final ViajeAsientoTramoOcupadoRepository tramoOcupadoRepo;
    private final EmbarcacionAsientoRepository embarcacionAsientoRepo;

    public AsientoService(ViajeAsientoEstadoRepository asientoEstadoRepo,
                          ViajeAsientoTramoOcupadoRepository tramoOcupadoRepo,
                          EmbarcacionAsientoRepository embarcacionAsientoRepo) {
        this.asientoEstadoRepo    = asientoEstadoRepo;
        this.tramoOcupadoRepo     = tramoOcupadoRepo;
        this.embarcacionAsientoRepo = embarcacionAsientoRepo;
    }

    // Ver todos los asientos de un viaje
    public List<AsientoDTO> listarPorViaje(String viajeId) {
        return asientoEstadoRepo.findByViajeIdOrderByNumeroAsc(viajeId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // Ver asientos libres para un tramo específico
    public List<AsientoDTO> listarLibresPorTramo(String viajeId,
                                                 int ordenOrigen,
                                                 int ordenDestino) {
        return asientoEstadoRepo
                .findAsientosLibresPorTramo(viajeId, ordenOrigen, ordenDestino)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // Copiar asientos de embarcacion al crear un viaje
    @Transactional
    public void inicializarAsientosParaViaje(String viajeId, String embarcacionId) {
        List<EmbarcacionAsiento> asientos = embarcacionAsientoRepo
                .findByEmbarcacionIdOrderByNumeroAsc(embarcacionId);

        List<ViajeAsientoEstado> estados = asientos.stream().map(a -> {
            ViajeAsientoEstado e = new ViajeAsientoEstado();
            e.setId(UUID.randomUUID().toString());
            e.setViajeId(viajeId);
            e.setNumero(a.getNumero());
            e.setTipo(ViajeAsientoEstado.TipoAsiento.valueOf(a.getTipo().name()));
            e.setEstado(ViajeAsientoEstado.EstadoAsiento.LIBRE);
            return e;
        }).collect(Collectors.toList());

        asientoEstadoRepo.saveAll(estados);
    }

    // Marcar asiento como vendido al hacer una venta
    @Transactional
    public void marcarVendido(String viajeId, Integer numeroAsiento,
                              String ventaId, String pasajeroNombre,
                              String pasajeroDoc, String pasajeroTel,
                              int ordenOrigen, int ordenDestino) {

        ViajeAsientoEstado asiento = asientoEstadoRepo
                .findByViajeIdAndNumero(viajeId, numeroAsiento)
                .orElseThrow(() -> new RuntimeException("Asiento no encontrado"));

        asiento.setEstado(ViajeAsientoEstado.EstadoAsiento.VENDIDO);
        asiento.setVentaId(ventaId);
        asiento.setPasajeroNombre(pasajeroNombre);
        asiento.setPasajeroDoc(pasajeroDoc);
        asiento.setPasajeroTel(pasajeroTel);
        asientoEstadoRepo.save(asiento);

        // Registrar los tramos ocupados
        List<ViajeAsientoTramoOcupado> tramos = new ArrayList<>();
        for (int i = ordenOrigen; i < ordenDestino; i++) {
            ViajeAsientoTramoOcupado t = new ViajeAsientoTramoOcupado();
            t.setId(UUID.randomUUID().toString());
            t.setViajeAsientoEstado(asiento);
            t.setTramo(String.valueOf(i));
            tramos.add(t);
        }
        tramoOcupadoRepo.saveAll(tramos);
    }

    // Liberar asiento al anular una venta
    @Transactional
    public void liberarAsiento(String ventaId) {
        ViajeAsientoEstado asiento = asientoEstadoRepo
                .findByVentaId(ventaId)
                .orElseThrow(() -> new RuntimeException("Asiento no encontrado"));

        tramoOcupadoRepo.deleteByViajeAsientoEstadoId(asiento.getId());

        asiento.setEstado(ViajeAsientoEstado.EstadoAsiento.LIBRE);
        asiento.setVentaId(null);
        asiento.setPasajeroNombre(null);
        asiento.setPasajeroDoc(null);
        asiento.setPasajeroTel(null);
        asientoEstadoRepo.save(asiento);
    }

    private AsientoDTO toDTO(ViajeAsientoEstado a) {
        AsientoDTO dto = new AsientoDTO();
        dto.setId(a.getId());
        dto.setNumero(a.getNumero());
        dto.setTipo(a.getTipo() != null ? a.getTipo().name() : null);
        dto.setEstado(a.getEstado() != null ? a.getEstado().name() : null);
        dto.setPasajeroNombre(a.getPasajeroNombre());
        dto.setPasajeroDoc(a.getPasajeroDoc());

        if (a.getTramosOcupados() != null) {
            dto.setTramosOcupados(a.getTramosOcupados().stream()
                    .map(ViajeAsientoTramoOcupado::getTramo)
                    .collect(Collectors.toList()));
        }

        return dto;
    }
}