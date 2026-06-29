package com.example.demo.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "ruta_tarifas_tramo")
public class RutaTarifaTramo {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ruta_id")
    private Ruta ruta;

    @Column(name = "origen_tramo", length = 100)
    private String origenTramo;

    @Column(name = "destino_tramo", length = 100)
    private String destinoTramo;

    @Column(name = "orden_origen")
    private Integer ordenOrigen;

    @Column(name = "orden_destino")
    private Integer ordenDestino;

    @Column(name = "precio_normal", precision = 10, scale = 2)
    private BigDecimal precioNormal;

    @Column(name = "precio_vip", precision = 10, scale = 2)
    private BigDecimal precioVip;

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Ruta getRuta() { return ruta; }
    public void setRuta(Ruta ruta) { this.ruta = ruta; }

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