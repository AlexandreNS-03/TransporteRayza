package com.example.demo.repository;

import com.example.demo.model.Caja;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CajaRepository extends JpaRepository<Caja, String> {

    Optional<Caja> findByUsuarioNombreAndEstado(String usuarioNombre, Caja.EstadoCaja estado);

    List<Caja> findAllByOrderByCreatedAtDesc();
}
