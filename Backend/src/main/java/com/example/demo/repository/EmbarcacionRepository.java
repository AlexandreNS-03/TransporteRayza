package com.example.demo.repository;

import com.example.demo.model.Embarcacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmbarcacionRepository extends JpaRepository<Embarcacion, String> {

    List<Embarcacion> findAllByOrderByNombreAsc();
    List<Embarcacion> findByActivoTrue();
    boolean existsByCodigo(String codigo);
}