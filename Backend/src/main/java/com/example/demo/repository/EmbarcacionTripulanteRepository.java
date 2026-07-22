package com.example.demo.repository;

import com.example.demo.model.EmbarcacionTripulante;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmbarcacionTripulanteRepository extends JpaRepository<EmbarcacionTripulante, String> {

    List<EmbarcacionTripulante> findByEmbarcacionId(String embarcacionId);

    void deleteByEmbarcacionId(String embarcacionId);
}
