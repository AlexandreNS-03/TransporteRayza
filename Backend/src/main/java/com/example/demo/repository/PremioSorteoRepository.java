package com.example.demo.repository;

import com.example.demo.model.PremioSorteo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PremioSorteoRepository extends JpaRepository<PremioSorteo, String> {

    /** Los premios de un sorteo, del mayor al menor: 1 es el premio grande. */
    List<PremioSorteo> findBySorteoIdOrderByOrdenAsc(String sorteoId);

    long countBySorteoId(String sorteoId);
}
