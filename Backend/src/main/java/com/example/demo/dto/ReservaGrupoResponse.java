package com.example.demo.dto;

import java.math.BigDecimal;
import java.util.List;

/** Respuesta al reservar un grupo: las reservas creadas y el monto total a pagar. */
public class ReservaGrupoResponse {
    private List<String> reservaIds;
    private BigDecimal montoTotal;
    private int montoCents;      // total en céntimos, que es como cobra la pasarela
    private String moneda;       // PEN
    private String expiraEn;     // ISO-8601; después de esa hora se liberan los asientos
    private String descripcion;
    private int cantidad;

    public List<String> getReservaIds() { return reservaIds; }
    public void setReservaIds(List<String> reservaIds) { this.reservaIds = reservaIds; }

    public BigDecimal getMontoTotal() { return montoTotal; }
    public void setMontoTotal(BigDecimal montoTotal) { this.montoTotal = montoTotal; }

    public int getMontoCents() { return montoCents; }
    public void setMontoCents(int montoCents) { this.montoCents = montoCents; }

    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }

    public String getExpiraEn() { return expiraEn; }
    public void setExpiraEn(String expiraEn) { this.expiraEn = expiraEn; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public int getCantidad() { return cantidad; }
    public void setCantidad(int cantidad) { this.cantidad = cantidad; }
}
