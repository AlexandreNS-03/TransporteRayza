package com.example.demo.repository;

import com.example.demo.model.Venta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VentaRepository extends JpaRepository<Venta, String> {
    List<Venta> findAllByOrderByFechaVentaDesc();
    List<Venta> findByViajeId(String viajeId);
    Optional<Venta> findByCodigoQr(String codigoQr);
    List<Venta> findByPasajeroDocumento(String documento);
}