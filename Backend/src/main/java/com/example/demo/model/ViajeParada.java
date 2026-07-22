package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "viaje_paradas")
public class ViajeParada {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "viaje_id")
    @JsonIgnore
    private Viaje viaje;

    @Column(name = "nombre", length = 100)
    private String nombre;

    @Column(name = "orden")
    private Integer orden;

    /** Copiado de la ruta al crear el viaje, para calcular la hora estimada de paso. */
    @Column(name = "minutos_desde_salida")
    private Integer minutosDesdeSalida;

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Viaje getViaje() { return viaje; }
    public void setViaje(Viaje viaje) { this.viaje = viaje; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public Integer getOrden() { return orden; }
    public void setOrden(Integer orden) { this.orden = orden; }

    public Integer getMinutosDesdeSalida() { return minutosDesdeSalida; }
    public void setMinutosDesdeSalida(Integer m) { this.minutosDesdeSalida = m; }
}