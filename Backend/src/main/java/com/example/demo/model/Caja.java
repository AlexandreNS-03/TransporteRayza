package com.example.demo.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "cajas")
public class Caja {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "usuario_id", length = 36)
    private String usuarioId;

    @Column(name = "usuario_nombre", length = 150)
    private String usuarioNombre;

    @Column(name = "usuario_rol", length = 20)
    private String usuarioRol;

    @Column(name = "sucursal_id", length = 36)
    private String sucursalId;

    @Column(name = "sucursal_nombre", length = 100)
    private String sucursalNombre;

    @Column(name = "fecha_apertura")
    private LocalDate fechaApertura;

    @Column(name = "hora_apertura")
    private LocalTime horaApertura;

    @Column(name = "monto_inicial", precision = 10, scale = 2)
    private BigDecimal montoInicial;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado")
    private EstadoCaja estado;

    @Column(name = "observacion_apertura", columnDefinition = "TEXT")
    private String observacionApertura;

    @Column(name = "total_ventas", precision = 10, scale = 2)
    private BigDecimal totalVentas;

    @Column(name = "total_anulaciones", precision = 10, scale = 2)
    private BigDecimal totalAnulaciones;

    @Column(name = "total_neto", precision = 10, scale = 2)
    private BigDecimal totalNeto;

    @Column(name = "monto_cierre", precision = 10, scale = 2)
    private BigDecimal montoCierre;

    @Column(name = "diferencia", precision = 10, scale = 2)
    private BigDecimal diferencia;

    @Column(name = "observacion_cierre", columnDefinition = "TEXT")
    private String observacionCierre;

    @Column(name = "cerrada_at")
    private LocalDateTime cerradaAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public enum EstadoCaja { ABIERTA, CERRADA }

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUsuarioId() { return usuarioId; }
    public void setUsuarioId(String usuarioId) { this.usuarioId = usuarioId; }

    public String getUsuarioNombre() { return usuarioNombre; }
    public void setUsuarioNombre(String usuarioNombre) { this.usuarioNombre = usuarioNombre; }

    public String getUsuarioRol() { return usuarioRol; }
    public void setUsuarioRol(String usuarioRol) { this.usuarioRol = usuarioRol; }

    public String getSucursalId() { return sucursalId; }
    public void setSucursalId(String sucursalId) { this.sucursalId = sucursalId; }

    public String getSucursalNombre() { return sucursalNombre; }
    public void setSucursalNombre(String sucursalNombre) { this.sucursalNombre = sucursalNombre; }

    public LocalDate getFechaApertura() { return fechaApertura; }
    public void setFechaApertura(LocalDate fechaApertura) { this.fechaApertura = fechaApertura; }

    public LocalTime getHoraApertura() { return horaApertura; }
    public void setHoraApertura(LocalTime horaApertura) { this.horaApertura = horaApertura; }

    public BigDecimal getMontoInicial() { return montoInicial; }
    public void setMontoInicial(BigDecimal montoInicial) { this.montoInicial = montoInicial; }

    public EstadoCaja getEstado() { return estado; }
    public void setEstado(EstadoCaja estado) { this.estado = estado; }

    public String getObservacionApertura() { return observacionApertura; }
    public void setObservacionApertura(String observacionApertura) { this.observacionApertura = observacionApertura; }

    public BigDecimal getTotalVentas() { return totalVentas; }
    public void setTotalVentas(BigDecimal totalVentas) { this.totalVentas = totalVentas; }

    public BigDecimal getTotalAnulaciones() { return totalAnulaciones; }
    public void setTotalAnulaciones(BigDecimal totalAnulaciones) { this.totalAnulaciones = totalAnulaciones; }

    public BigDecimal getTotalNeto() { return totalNeto; }
    public void setTotalNeto(BigDecimal totalNeto) { this.totalNeto = totalNeto; }

    public BigDecimal getMontoCierre() { return montoCierre; }
    public void setMontoCierre(BigDecimal montoCierre) { this.montoCierre = montoCierre; }

    public BigDecimal getDiferencia() { return diferencia; }
    public void setDiferencia(BigDecimal diferencia) { this.diferencia = diferencia; }

    public String getObservacionCierre() { return observacionCierre; }
    public void setObservacionCierre(String observacionCierre) { this.observacionCierre = observacionCierre; }

    public LocalDateTime getCerradaAt() { return cerradaAt; }
    public void setCerradaAt(LocalDateTime cerradaAt) { this.cerradaAt = cerradaAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
