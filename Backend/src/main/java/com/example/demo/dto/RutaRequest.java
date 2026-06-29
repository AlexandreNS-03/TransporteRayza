package com.example.demo.dto;

import java.math.BigDecimal;
import java.util.List;

public class RutaRequest {

    private String origen;
    private String destino;
    private String sucursalAdministradoraId;
    private BigDecimal precioNormal;
    private BigDecimal precioVip;
    private String duracionAproximada;
    private Boolean activo;
    private List<ParadaRequest> paradas;
    private List<TarifaTramoRequest> tarifas;

    public static class ParadaRequest {
        private String nombre;
        private Integer orden;

        public String getNombre() { return nombre; }
        public void setNombre(String nombre) { this.nombre = nombre; }

        public Integer getOrden() { return orden; }
        public void setOrden(Integer orden) { this.orden = orden; }
    }

    public static class TarifaTramoRequest {
        private String origenTramo;
        private String destinoTramo;
        private Integer ordenOrigen;
        private Integer ordenDestino;
        private BigDecimal precioNormal;
        private BigDecimal precioVip;

        public String getOrigenTramo() { return origenTramo; }
        public void setOrigenTramo(String origenTramo) { this.origenTramo = origenTramo; }

        public String getDestinoTramo() { return destinoTramo; }
        public void setDestinoTramo(String destinoTramo) { this.destinoTramo = destinoTramo; }

        public Integer getOrdenOrigen() { return ordenOrigen; }
        public void setOrdenOrigen(Integer ordenOrigen) { this.ordenOrigen = ordenOrigen; }

        public Integer getOrdenDestino() { return ordenDestino; }
        public void setOrdenDestino(Integer ordenDestino) { this.ordenDestino = ordenDestino; }

        public BigDecimal getPrecioNormal() { return precioNormal; }
        public void setPrecioNormal(BigDecimal precioNormal) { this.precioNormal = precioNormal; }

        public BigDecimal getPrecioVip() { return precioVip; }
        public void setPrecioVip(BigDecimal precioVip) { this.precioVip = precioVip; }
    }

    // Getters y Setters
    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }

    public String getDestino() { return destino; }
    public void setDestino(String destino) { this.destino = destino; }

    public String getSucursalAdministradoraId() { return sucursalAdministradoraId; }
    public void setSucursalAdministradoraId(String id) { this.sucursalAdministradoraId = id; }

    public BigDecimal getPrecioNormal() { return precioNormal; }
    public void setPrecioNormal(BigDecimal precioNormal) { this.precioNormal = precioNormal; }

    public BigDecimal getPrecioVip() { return precioVip; }
    public void setPrecioVip(BigDecimal precioVip) { this.precioVip = precioVip; }

    public String getDuracionAproximada() { return duracionAproximada; }
    public void setDuracionAproximada(String d) { this.duracionAproximada = d; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public List<ParadaRequest> getParadas() { return paradas; }
    public void setParadas(List<ParadaRequest> paradas) { this.paradas = paradas; }

    public List<TarifaTramoRequest> getTarifas() { return tarifas; }
    public void setTarifas(List<TarifaTramoRequest> tarifas) { this.tarifas = tarifas; }
}