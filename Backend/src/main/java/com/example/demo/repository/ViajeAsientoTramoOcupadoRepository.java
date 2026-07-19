package com.example.demo.repository;

import com.example.demo.model.ViajeAsientoTramoOcupado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ViajeAsientoTramoOcupadoRepository extends JpaRepository<ViajeAsientoTramoOcupado, String> {
    void deleteByViajeAsientoEstadoId(String asientoEstadoId);

    boolean existsByViajeAsientoEstadoIdAndTramoIn(String asientoEstadoId, java.util.List<String> tramos);
}