package com.example.demo.dto;

import java.math.BigDecimal;

public class VentaPorDiaDTO {
    private String dia;
    private int ventas;
    private BigDecimal ingresos;

    public VentaPorDiaDTO(String dia, int ventas, BigDecimal ingresos) {
        this.dia = dia;
        this.ventas = ventas;
        this.ingresos = ingresos;
    }

    public String getDia() { return dia; }
    public void setDia(String dia) { this.dia = dia; }

    public int getVentas() { return ventas; }
    public void setVentas(int ventas) { this.ventas = ventas; }

    public BigDecimal getIngresos() { return ingresos; }
    public void setIngresos(BigDecimal ingresos) { this.ingresos = ingresos; }
}