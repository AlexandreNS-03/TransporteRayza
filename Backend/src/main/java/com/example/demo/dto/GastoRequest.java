package com.example.demo.dto;

import java.math.BigDecimal;

public class GastoRequest {

    private String fecha;        // yyyy-MM-dd (vacío = hoy)
    private String categoria;    // COMBUSTIBLE, MANTENIMIENTO, PERSONAL, OTROS...
    private String descripcion;
    private BigDecimal monto;
    private String observacion;
    private boolean afectaCaja;  // true = registra egreso en la caja abierta del usuario

    public String getFecha() { return fecha; }
    public void setFecha(String fecha) { this.fecha = fecha; }

    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }

    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }

    public boolean isAfectaCaja() { return afectaCaja; }
    public void setAfectaCaja(boolean afectaCaja) { this.afectaCaja = afectaCaja; }
}
