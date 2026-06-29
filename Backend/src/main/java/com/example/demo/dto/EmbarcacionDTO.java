package com.example.demo.dto;

import java.util.List;

public class EmbarcacionDTO {

    private String id;
    private String nombre;
    private String codigo;
    private Integer cantidadVip;
    private Integer cantidadNormal;
    private Integer capacidadTotal;
    private Boolean activo;
    private String createdAt;
    private List<AsientoDTO> asientos;

    public static class AsientoDTO {
        private String id;
        private Integer numero;
        private String tipo;

        public AsientoDTO(String id, Integer numero, String tipo) {
            this.id = id;
            this.numero = numero;
            this.tipo = tipo;
        }

        public String getId() { return id; }
        public Integer getNumero() { return numero; }
        public String getTipo() { return tipo; }
    }

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public Integer getCantidadVip() { return cantidadVip; }
    public void setCantidadVip(Integer cantidadVip) { this.cantidadVip = cantidadVip; }

    public Integer getCantidadNormal() { return cantidadNormal; }
    public void setCantidadNormal(Integer cantidadNormal) { this.cantidadNormal = cantidadNormal; }

    public Integer getCapacidadTotal() { return capacidadTotal; }
    public void setCapacidadTotal(Integer capacidadTotal) { this.capacidadTotal = capacidadTotal; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public List<AsientoDTO> getAsientos() { return asientos; }
    public void setAsientos(List<AsientoDTO> asientos) { this.asientos = asientos; }
}