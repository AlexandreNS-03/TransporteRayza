package com.example.demo.dto;

public class TopRutaDTO {
    private String ruta;
    private int ventas;

    public TopRutaDTO(String ruta, int ventas) {
        this.ruta = ruta;
        this.ventas = ventas;
    }

    public String getRuta() { return ruta; }
    public void setRuta(String ruta) { this.ruta = ruta; }

    public int getVentas() { return ventas; }
    public void setVentas(int ventas) { this.ventas = ventas; }
}