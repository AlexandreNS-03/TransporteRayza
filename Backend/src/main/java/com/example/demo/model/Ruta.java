package com.example.demo.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "rutas")
public class Ruta {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "origen", length = 100)
    private String origen;

    @Column(name = "destino", length = 100)
    private String destino;

    @Column(name = "sucursal_administradora_id", length = 36)
    private String sucursalAdministradoraId;

    @Column(name = "sucursal_administradora_nombre", length = 100)
    private String sucursalAdministradoraNombre;

    @Column(name = "precio_normal", precision = 10, scale = 2)
    private BigDecimal precioNormal;

    @Column(name = "precio_vip", precision = 10, scale = 2)
    private BigDecimal precioVip;

    @Column(name = "duracion_aproximada", length = 50)
    private String duracionAproximada;

    @Column(name = "activo")
    private Boolean activo;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "ruta", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @OrderBy("orden ASC")
    private List<RutaParada> paradas;

    @OneToMany(mappedBy = "ruta", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @OrderBy("ordenOrigen ASC")
    private List<RutaTarifaTramo> tarifas;

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

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public List<RutaParada> getParadas() { return paradas; }
    public void setParadas(List<RutaParada> paradas) { this.paradas = paradas; }

    public List<RutaTarifaTramo> getTarifas() { return tarifas; }
    public void setTarifas(List<RutaTarifaTramo> tarifas) { this.tarifas = tarifas; }
}