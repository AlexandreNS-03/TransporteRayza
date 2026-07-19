package com.example.demo.repository;

import com.example.demo.model.MovimientoCaja;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MovimientoCajaRepository extends JpaRepository<MovimientoCaja, String> {

    List<MovimientoCaja> findByCajaIdOrderByCreatedAtDesc(String cajaId);
}
