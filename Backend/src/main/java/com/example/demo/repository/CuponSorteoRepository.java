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

    /**
     * Los que entran al sorteo: solo los registrados por su dueño.
     *
     * El orden es fijo (por cuándo se registraron) porque la rueda de la web
     * pinta un sector por participante en este mismo orden: si cambiara entre
     * dos llamadas, la aguja frenaría sobre un nombre que no es el del ganador.
     */
    @Query("SELECT c FROM CuponSorteo c WHERE c.sorteoId = :sorteoId AND c.registradoAt IS NOT NULL "
         + "ORDER BY c.registradoAt ASC, c.id ASC")
    List<CuponSorteo> participantesDe(String sorteoId);

    long countBySorteoId(String sorteoId);
}
