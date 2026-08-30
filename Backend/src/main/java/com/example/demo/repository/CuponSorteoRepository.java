package com.example.demo.repository;

import com.example.demo.model.CuponSorteo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CuponSorteoRepository extends JpaRepository<CuponSorteo, String> {

    Optional<CuponSorteo> findByCodigo(String codigo);

    Optional<CuponSorteo> findByVentaId(String ventaId);

    /** Los que entran al sorteo: solo los registrados por su dueño. */
    @Query("SELECT c FROM CuponSorteo c WHERE c.sorteoId = :sorteoId AND c.registradoAt IS NOT NULL")
    List<CuponSorteo> participantesDe(String sorteoId);

    long countBySorteoId(String sorteoId);
}
