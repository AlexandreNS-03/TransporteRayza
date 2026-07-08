package com.example.demo.dto;

public class OcupacionTipoDTO {
    private String tipo;
    private int cantidad;

    public OcupacionTipoDTO(String tipo, int cantidad) {
        this.tipo = tipo;
        this.cantidad = cantidad;
    }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public int getCantidad() { return cantidad; }
    public void setCantidad(int cantidad) { this.cantidad = cantidad; }
}