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

    /** Precio para la web cuando la ruta está en oferta; el mostrador nunca lo usa. */
    @Column(name = "precio_normal_oferta", precision = 10, scale = 2)
    private BigDecimal precioNormalOferta;

    @Column(name = "precio_vip_oferta", precision = 10, scale = 2)
    private BigDecimal precioVipOferta;

    @Column(name = "oferta_activa")
    private Boolean ofertaActiva;

    /** Rango de FECHAS DE VIAJE en que corre la oferta. Null = sin ese límite. */
    @Column(name = "oferta_desde")
    private java.time.LocalDate ofertaDesde;

    @Column(name = "oferta_hasta")
    private java.time.LocalDate ofertaHasta;

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

    @OneToMany(mappedBy = "ruta", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @OrderBy("ordenOrigen ASC")
    private List<RutaTramoBloqueado> tramosBloqueados;

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

    public BigDecimal getPrecioNormalOferta() { return precioNormalOferta; }
    public void setPrecioNormalOferta(BigDecimal precioNormalOferta) { this.precioNormalOferta = precioNormalOferta; }

    public BigDecimal getPrecioVipOferta() { return precioVipOferta; }
    public void setPrecioVipOferta(BigDecimal precioVipOferta) { this.precioVipOferta = precioVipOferta; }

    public Boolean getOfertaActiva() { return ofertaActiva; }
    public void setOfertaActiva(Boolean ofertaActiva) { this.ofertaActiva = ofertaActiva; }

    public java.time.LocalDate getOfertaDesde() { return ofertaDesde; }
    public void setOfertaDesde(java.time.LocalDate ofertaDesde) { this.ofertaDesde = ofertaDesde; }

    public java.time.LocalDate getOfertaHasta() { return ofertaHasta; }
    public void setOfertaHasta(java.time.LocalDate ofertaHasta) { this.ofertaHasta = ofertaHasta; }

    /** ¿La oferta corre para un viaje que sale en esta fecha? */
    public boolean ofertaVigenteEn(java.time.LocalDate fechaViaje) {
        if (!Boolean.TRUE.equals(ofertaActiva)) return false;
        if (precioNormalOferta == null || precioVipOferta == null) return false;
        if (fechaViaje == null) return ofertaDesde == null && ofertaHasta == null;
        if (ofertaDesde != null && fechaViaje.isBefore(ofertaDesde)) return false;
        if (ofertaHasta != null && fechaViaje.isAfter(ofertaHasta)) return false;
        return true;
    }

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

    public List<RutaTramoBloqueado> getTramosBloqueados() { return tramosBloqueados; }
    public void setTramosBloqueados(List<RutaTramoBloqueado> tramosBloqueados) { this.tramosBloqueados = tramosBloqueados; }
}