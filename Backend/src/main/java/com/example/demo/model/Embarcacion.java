package com.example.demo.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
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

    // Posición física de la zona VIP en el bote: PROA (adelante) o POPA (atrás)
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "vip_posicion", length = 10)
    private VipPosicion vipPosicion;

    @Column(name = "capitan", length = 150)
    private String capitan;

    @Column(name = "activo")
    private Boolean activo;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "embarcacion", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @OrderBy("numero ASC")
    private List<EmbarcacionAsiento> asientos;

    // La tripulación se administra por su propio repositorio (sin cascade),
    // para poder reemplazarla al editar sin conflictos de Hibernate.

    public enum VipPosicion { PROA, POPA }

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

    public VipPosicion getVipPosicion() { return vipPosicion; }
    public void setVipPosicion(VipPosicion vipPosicion) { this.vipPosicion = vipPosicion; }

    public String getCapitan() { return capitan; }
    public void setCapitan(String capitan) { this.capitan = capitan; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public List<EmbarcacionAsiento> getAsientos() { return asientos; }
    public void setAsientos(List<EmbarcacionAsiento> asientos) { this.asientos = asientos; }
}