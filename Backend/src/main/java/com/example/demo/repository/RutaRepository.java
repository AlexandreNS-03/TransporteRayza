package com.example.demo.repository;

import com.example.demo.model.Ruta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RutaRepository extends JpaRepository<Ruta, String> {
    List<Ruta> findAllByOrderByOrigenAsc();
    List<Ruta> findByActivoTrue();
}