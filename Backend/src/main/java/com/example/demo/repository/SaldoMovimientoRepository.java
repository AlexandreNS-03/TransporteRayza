package com.example.demo.repository;

import com.example.demo.model.SaldoMovimiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface SaldoMovimientoRepository extends JpaRepository<SaldoMovimiento, String> {

    List<SaldoMovimiento> findByClienteEmailIgnoreCaseOrderByCreatedAtDesc(String email);

    @Query("SELECT COALESCE(SUM(m.monto), 0) FROM SaldoMovimiento m WHERE LOWER(m.clienteEmail) = LOWER(:email)")
    BigDecimal saldoDe(@Param("email") String email);
}
