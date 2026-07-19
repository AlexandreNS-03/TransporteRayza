package com.example.demo.repository;

import com.example.demo.model.Gasto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GastoRepository extends JpaRepository<Gasto, String> {

    List<Gasto> findAllByOrderByFechaDesc();
}
