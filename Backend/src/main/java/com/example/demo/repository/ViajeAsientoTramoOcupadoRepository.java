package com.example.demo.repository;

import com.example.demo.model.ViajeAsientoTramoOcupado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ViajeAsientoTramoOcupadoRepository extends JpaRepository<ViajeAsientoTramoOcupado, String> {
    void deleteByViajeAsientoEstadoId(String asientoEstadoId);

    /** Tramos de un asiento; con varios pasajeros por asiento hay más de una venta detrás. */
    java.util.List<ViajeAsientoTramoOcupado> findByViajeAsientoEstadoId(String asientoEstadoId);

    void deleteByViajeAsientoEstadoIdAndTramoIn(String asientoEstadoId, java.util.List<String> tramos);

    boolean existsByViajeAsientoEstadoIdAndTramoIn(String asientoEstadoId, java.util.List<String> tramos);
}