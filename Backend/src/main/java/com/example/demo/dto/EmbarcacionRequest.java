package com.example.demo.dto;

import java.util.List;

public class EmbarcacionRequest {

    private String nombre;
    private String codigo;
    private Integer cantidadVip;
    private Integer cantidadNormal;
    private String vipPosicion;        // PROA | POPA
    private String capitan;
    private List<TripulanteDTO> tripulantes;
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

    public String getVipPosicion() { return vipPosicion; }
    public void setVipPosicion(String vipPosicion) { this.vipPosicion = vipPosicion; }

    public String getCapitan() { return capitan; }
    public void setCapitan(String capitan) { this.capitan = capitan; }

    public List<TripulanteDTO> getTripulantes() { return tripulantes; }
    public void setTripulantes(List<TripulanteDTO> tripulantes) { this.tripulantes = tripulantes; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
}