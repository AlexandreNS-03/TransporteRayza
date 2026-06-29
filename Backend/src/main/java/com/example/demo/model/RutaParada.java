package com.example.demo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "ruta_paradas")
public class RutaParada {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ruta_id")
    private Ruta ruta;

    @Column(name = "nombre", length = 100)
    private String nombre;

    @Column(name = "orden")
    private Integer orden;

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Ruta getRuta() { return ruta; }
    public void setRuta(Ruta ruta) { this.ruta = ruta; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public Integer getOrden() { return orden; }
    public void setOrden(Integer orden) { this.orden = orden; }
}