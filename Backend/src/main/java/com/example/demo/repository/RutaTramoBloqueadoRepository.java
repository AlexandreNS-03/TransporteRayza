package com.example.demo.repository;

import com.example.demo.model.RutaTramoBloqueado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RutaTramoBloqueadoRepository extends JpaRepository<RutaTramoBloqueado, String> {
    void deleteByRutaId(String rutaId);
    List<RutaTramoBloqueado> findByRutaId(String rutaId);
}
