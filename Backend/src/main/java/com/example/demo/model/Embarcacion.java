package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "embarcaciones")
public class Embarcacion {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "nombre", length = 100)
    private String nombre;

    @Column(name = "codigo", length = 20)
    private String codigo;

    @Column(name = "cantidad_vip")
    private Integer cantidadVip;

    @Column(name = "cantidad_normal")
    private Integer cantidadNormal;

    @Column(name = "capacidad_total")
    private Integer capacidadTotal;

    @Column(name = "activo")
    private Boolean activo;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "embarcacion", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @OrderBy("numero ASC")
    private List<EmbarcacionAsiento> asientos;

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

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public List<EmbarcacionAsiento> getAsientos() { return asientos; }
    public void setAsientos(List<EmbarcacionAsiento> asientos) { this.asientos = asientos; }
}