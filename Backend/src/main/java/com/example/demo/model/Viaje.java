package com.example.demo.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Entity
@Table(name = "viajes")
public class Viaje {

    @Id
    @Column(length = 36)
    private String id;


    @Column(name = "codigo_viaje", length = 50)
    private String codigoViaje;

    @Column(name = "sucursal_id", length = 36)
    private String sucursalId;

    @Column(name = "ruta_id", length = 36)
    private String rutaId;

    @Column(name = "embarcacion_id", length = 36)
    private String embarcacionId;

    @Column(name = "sucursal_nombre", length = 100)
    private String sucursalNombre;

    @Column(name = "ruta_nombre", length = 200)
    private String rutaNombre;

    @Column(name = "origen", length = 100)
    private String origen;

    @Column(name = "destino", length = 100)
    private String destino;

    @Column(name = "embarcacion_nombre", length = 100)
    private String embarcacionNombre;

    @Column(name = "fecha_salida")
    private LocalDate fechaSalida;

    @Column(name = "hora_salida")
    private LocalTime horaSalida;

    @Column(name = "precio_normal", precision = 10, scale = 2)
    private BigDecimal precioNormal;

    @Column(name = "precio_vip", precision = 10, scale = 2)
    private BigDecimal precioVip;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado")
    private EstadoViaje estado;

    @OneToMany(mappedBy = "viaje", fetch = FetchType.LAZY)
    @OrderBy("orden ASC")
    private List<ViajeParada> paradas;

    public enum EstadoViaje {
        PROGRAMADO, EN_CURSO, COMPLETADO, CANCELADO
    }

    // Getters y Setters



    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCodigoViaje() { return codigoViaje; }
    public void setCodigoViaje(String codigoViaje) { this.codigoViaje = codigoViaje; }

    public String getSucursalId() { return sucursalId; }
    public void setSucursalId(String sucursalId) { this.sucursalId = sucursalId; }

    public String getRutaId() { return rutaId; }
    public void setRutaId(String rutaId) { this.rutaId = rutaId; }

    public String getEmbarcacionId() { return embarcacionId; }
    public void setEmbarcacionId(String embarcacionId) { this.embarcacionId = embarcacionId; }

    public String getSucursalNombre() { return sucursalNombre; }
    public void setSucursalNombre(String sucursalNombre) { this.sucursalNombre = sucursalNombre; }

    public String getRutaNombre() { return rutaNombre; }
    public void setRutaNombre(String rutaNombre) { this.rutaNombre = rutaNombre; }

    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }

    public String getDestino() { return destino; }
    public void setDestino(String destino) { this.destino = destino; }

    public String getEmbarcacionNombre() { return embarcacionNombre; }
    public void setEmbarcacionNombre(String embarcacionNombre) { this.embarcacionNombre = embarcacionNombre; }

    public LocalDate getFechaSalida() { return fechaSalida; }
    public void setFechaSalida(LocalDate fechaSalida) { this.fechaSalida = fechaSalida; }

    public LocalTime getHoraSalida() { return horaSalida; }
    public void setHoraSalida(LocalTime horaSalida) { this.horaSalida = horaSalida; }

    public BigDecimal getPrecioNormal() { return precioNormal; }
    public void setPrecioNormal(BigDecimal precioNormal) { this.precioNormal = precioNormal; }

    public BigDecimal getPrecioVip() { return precioVip; }
    public void setPrecioVip(BigDecimal precioVip) { this.precioVip = precioVip; }

    public EstadoViaje getEstado() { return estado; }
    public void setEstado(EstadoViaje estado) { this.estado = estado; }

    public List<ViajeParada> getParadas() { return paradas; }
    public void setParadas(List<ViajeParada> paradas) { this.paradas = paradas; }
}