package com.example.demo.dto;

import java.math.BigDecimal;
import java.util.List;

public class RutaDTO {

    private String id;
    private String origen;
    private String destino;
    private String sucursalAdministradoraId;
    private String sucursalAdministradoraNombre;
    private BigDecimal precioNormal;
    private BigDecimal precioVip;
    private String duracionAproximada;
    private Boolean activo;
    private String createdAt;
    private List<ParadaDTO> paradas;
    private List<TarifaTramoDTO> tarifas;

    public static class ParadaDTO {
        private String id;
        private String nombre;
        private Integer orden;
        private Integer minutosDesdeSalida;

        public ParadaDTO(String id, String nombre, Integer orden) {
            this.id = id;
            this.nombre = nombre;
            this.orden = orden;
        }

        public String getId() { return id; }
        public String getNombre() { return nombre; }
        public Integer getOrden() { return orden; }

        public Integer getMinutosDesdeSalida() { return minutosDesdeSalida; }
        public void setMinutosDesdeSalida(Integer m) { this.minutosDesdeSalida = m; }
    }

    public static class TarifaTramoDTO {
        private String id;
        private String origenTramo;
        private String destinoTramo;
        private Integer ordenOrigen;
        private Integer ordenDestino;
        private BigDecimal precioNormal;
        private BigDecimal precioVip;

        public TarifaTramoDTO(String id, String origenTramo, String destinoTramo,
                              Integer ordenOrigen, Integer ordenDestino,
                              BigDecimal precioNormal, BigDecimal precioVip) {
            this.id = id;
            this.origenTramo = origenTramo;
            this.destinoTramo = destinoTramo;
            this.ordenOrigen = ordenOrigen;
            this.ordenDestino = ordenDestino;
            this.precioNormal = precioNormal;
            this.precioVip = precioVip;
        }

        public String getId() { return id; }
        public String getOrigenTramo() { return origenTramo; }
        public String getDestinoTramo() { return destinoTramo; }
        public Integer getOrdenOrigen() { return ordenOrigen; }
        public Integer getOrdenDestino() { return ordenDestino; }
        public BigDecimal getPrecioNormal() { return precioNormal; }
        public BigDecimal getPrecioVip() { return precioVip; }
    }

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }

    public String getDestino() { return destino; }
    public void setDestino(String destino) { this.destino = destino; }

    public String getSucursalAdministradoraId() { return sucursalAdministradoraId; }
    public void setSucursalAdministradoraId(String id) { this.sucursalAdministradoraId = id; }

    public String getSucursalAdministradoraNombre() { return sucursalAdministradoraNombre; }
    public void setSucursalAdministradoraNombre(String n) { this.sucursalAdministradoraNombre = n; }

    public BigDecimal getPrecioNormal() { return precioNormal; }
    public void setPrecioNormal(BigDecimal precioNormal) { this.precioNormal = precioNormal; }

    public BigDecimal getPrecioVip() { return precioVip; }
    public void setPrecioVip(BigDecimal precioVip) { this.precioVip = precioVip; }

    public String getDuracionAproximada() { return duracionAproximada; }
    public void setDuracionAproximada(String d) { this.duracionAproximada = d; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public List<ParadaDTO> getParadas() { return paradas; }
    public void setParadas(List<ParadaDTO> paradas) { this.paradas = paradas; }

    public List<TarifaTramoDTO> getTarifas() { return tarifas; }
    public void setTarifas(List<TarifaTramoDTO> tarifas) { this.tarifas = tarifas; }
}