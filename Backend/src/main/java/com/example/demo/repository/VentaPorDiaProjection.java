package com.example.demo.repository;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface VentaPorDiaProjection {
    LocalDate getDia();
    Long getVentas();
    BigDecimal getIngresos();
}