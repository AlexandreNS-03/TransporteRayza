package com.example.demo.repository;

import com.example.demo.model.RutaTarifaTramo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RutaTarifaTramoRepository extends JpaRepository<RutaTarifaTramo, String> {
    void deleteByRutaId(String rutaId);
}