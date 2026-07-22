package com.example.demo.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Ruta activa con sus paradas y tramos, para armar los combos (Desde/Hacia) de la
 * web del cliente directamente desde la base de datos.
 */
public class PublicRutaDTO {

    private String id;
    private String origen;
    private String destino;
    private String duracionAproximada;
    private List<Parada> paradas;
    private List<Tramo> tramos;

    public static class Parada {
        private String nombre;
        private Integer orden;
        public Parada(String nombre, Integer orden) { this.nombre = nombre; this.orden = orden; }
        public String getNombre() { return nombre; }
        public Integer getOrden() { return orden; }
    }

    public static class Tramo {
        private String origen;
        private String destino;
        private Integer ordenOrigen;
        private Integer ordenDestino;
        private BigDecimal precioNormal;
        private BigDecimal precioVip;
        public Tramo(String origen, String destino, Integer ordenOrigen, Integer ordenDestino,
                     BigDecimal precioNormal, BigDecimal precioVip) {
            this.origen = origen; this.destino = destino;
            this.ordenOrigen = ordenOrigen; this.ordenDestino = ordenDestino;
            this.precioNormal = precioNormal; this.precioVip = precioVip;
        }
        public String getOrigen() { return origen; }
        public String getDestino() { return destino; }
        public Integer getOrdenOrigen() { return ordenOrigen; }
        public Integer getOrdenDestino() { return ordenDestino; }
        public BigDecimal getPrecioNormal() { return precioNormal; }
        public BigDecimal getPrecioVip() { return precioVip; }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }

    public String getDestino() { return destino; }
    public void setDestino(String destino) { this.destino = destino; }

    public String getDuracionAproximada() { return duracionAproximada; }
    public void setDuracionAproximada(String duracionAproximada) { this.duracionAproximada = duracionAproximada; }

    public List<Parada> getParadas() { return paradas; }
    public void setParadas(List<Parada> paradas) { this.paradas = paradas; }

    public List<Tramo> getTramos() { return tramos; }
    public void setTramos(List<Tramo> tramos) { this.tramos = tramos; }
}
