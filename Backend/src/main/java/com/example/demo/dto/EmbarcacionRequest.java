package com.example.demo.dto;

public class EmbarcacionRequest {

    private String nombre;
    private String codigo;
    private Integer cantidadVip;
    private Integer cantidadNormal;
    private Boolean activo;

    // Getters y Setters
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }

    public Integer getCantidadVip() { return cantidadVip; }
    public void setCantidadVip(Integer cantidadVip) { this.cantidadVip = cantidadVip; }

    public Integer getCantidadNormal() { return cantidadNormal; }
    public void setCantidadNormal(Integer cantidadNormal) { this.cantidadNormal = cantidadNormal; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
}