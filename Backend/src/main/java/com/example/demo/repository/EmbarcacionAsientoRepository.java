package com.example.demo.repository;

import com.example.demo.model.EmbarcacionAsiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;


@Repository
public interface EmbarcacionAsientoRepository extends JpaRepository<EmbarcacionAsiento, String> {
    List<EmbarcacionAsiento> findByEmbarcacionIdOrderByNumeroAsc(String embarcacionId);
    List<EmbarcacionAsiento> findByEmbarcacionId(String embarcacionId);

    @Modifying
    @Transactional
    void deleteByEmbarcacionId(String embarcacionId);
}