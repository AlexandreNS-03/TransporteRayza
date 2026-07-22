package com.example.demo.repository;

import com.example.demo.model.ViajeParada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ViajeParadaRepository extends JpaRepository<ViajeParada, String> {
    List<ViajeParada> findByViajeIdOrderByOrdenAsc(String viajeId);
    void deleteByViajeId(String viajeId);
}
