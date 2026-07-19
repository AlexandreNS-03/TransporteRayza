package com.example.demo.repository;

import com.example.demo.model.Encomienda;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EncomiendaRepository extends JpaRepository<Encomienda, String> {

    List<Encomienda> findAllByOrderByCreatedAtDesc();

    Optional<Encomienda> findTopByOrderByCodigoEncomiendaDesc();
}
