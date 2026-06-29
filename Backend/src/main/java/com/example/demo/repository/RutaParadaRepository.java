package com.example.demo.repository;

import com.example.demo.model.RutaParada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RutaParadaRepository extends JpaRepository<RutaParada, String> {
    void deleteByRutaId(String rutaId);
}