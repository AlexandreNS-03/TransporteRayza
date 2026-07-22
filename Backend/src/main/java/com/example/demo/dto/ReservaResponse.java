package com.example.demo.dto;

import java.math.BigDecimal;

/** Respuesta al crear una reserva: identifica la venta pendiente y el monto a pagar. */
public class ReservaResponse {
    private String reservaId;
    private BigDecimal monto;
    private int montoCents;      // para Culqi (céntimos)
    private String moneda;       // PEN
    private String expiraEn;     // ISO-8601; después de esa hora se libera el asiento
    private String descripcion;

    public String getReservaId() { return reservaId; }
    public void setReservaId(String reservaId) { this.reservaId = reservaId; }

    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }

    public int getMontoCents() { return montoCents; }
    public void setMontoCents(int montoCents) { this.montoCents = montoCents; }

    public String getMoneda() { return moneda; }
    public void setMoneda(String moneda) { this.moneda = moneda; }

    public String getExpiraEn() { return expiraEn; }
    public void setExpiraEn(String expiraEn) { this.expiraEn = expiraEn; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
}
