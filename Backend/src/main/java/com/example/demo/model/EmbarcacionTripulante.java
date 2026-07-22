package com.example.demo.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "embarcacion_tripulantes")
public class EmbarcacionTripulante {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "embarcacion_id")
    @JsonIgnore
    private Embarcacion embarcacion;

    @Column(name = "nombre", length = 150, nullable = false)
    private String nombre;

    @Column(name = "cargo", length = 60)
    private String cargo;

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Embarcacion getEmbarcacion() { return embarcacion; }
    public void setEmbarcacion(Embarcacion embarcacion) { this.embarcacion = embarcacion; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getCargo() { return cargo; }
    public void setCargo(String cargo) { this.cargo = cargo; }
}
