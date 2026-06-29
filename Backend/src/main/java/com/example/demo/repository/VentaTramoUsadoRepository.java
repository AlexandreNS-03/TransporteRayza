package com.example.demo.repository;

import com.example.demo.model.VentaTramoUsado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VentaTramoUsadoRepository extends JpaRepository<VentaTramoUsado, String> {
    void deleteByVentaId(String ventaId);
}