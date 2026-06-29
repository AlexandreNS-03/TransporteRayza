package com.example.demo.dto;

import java.math.BigDecimal;
import java.util.List;

public class ViajeDTO {

    private String id;
    private String codigoViaje;
    private String sucursalNombre;
    private String rutaNombre;
    private String origen;
    private String destino;
    private String embarcacionNombre;
    private String fechaSalida;
    private String horaSalida;
    private BigDecimal precioNormal;
    private BigDecimal precioVip;
    private String estado;
    private List<ParadaDTO> paradas;

    public static class ParadaDTO {
        private String nombre;
        private Integer orden;

        public ParadaDTO(String nombre, Integer orden) {
            this.nombre = nombre;
            this.orden  = orden;
        }

        public String getNombre() { return nombre; }
        public Integer getOrden() { return orden; }
    }

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCodigoViaje() { return codigoViaje; }
    public void setCodigoViaje(String codigoViaje) { this.codigoViaje = codigoViaje; }

    public String getSucursalNombre() { return sucursalNombre; }
    public void setSucursalNombre(String s) { this.sucursalNombre = s; }

    public String getRutaNombre() { return rutaNombre; }
    public void setRutaNombre(String rutaNombre) { this.rutaNombre = rutaNombre; }

    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }

    public String getDestino() { return destino; }
    public void setDestino(String destino) { this.destino = destino; }

    public String getEmbarcacionNombre() { return embarcacionNombre; }
    public void setEmbarcacionNombre(String e) { this.embarcacionNombre = e; }

    public String getFechaSalida() { return fechaSalida; }
    public void setFechaSalida(String fechaSalida) { this.fechaSalida = fechaSalida; }

    public String getHoraSalida() { return horaSalida; }
    public void setHoraSalida(String horaSalida) { this.horaSalida = horaSalida; }

    public BigDecimal getPrecioNormal() { return precioNormal; }
    public void setPrecioNormal(BigDecimal p) { this.precioNormal = p; }

    public BigDecimal getPrecioVip() { return precioVip; }
    public void setPrecioVip(BigDecimal p) { this.precioVip = p; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public List<ParadaDTO> getParadas() { return paradas; }
    public void setParadas(List<ParadaDTO> paradas) { this.paradas = paradas; }
}