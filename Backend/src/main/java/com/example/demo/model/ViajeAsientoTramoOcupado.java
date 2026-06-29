package com.example.demo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "viaje_asiento_tramos_ocupados")
public class ViajeAsientoTramoOcupado {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "viaje_asiento_estado_id")
    private ViajeAsientoEstado viajeAsientoEstado;

    @Column(name = "tramo", length = 10)
    private String tramo;

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public ViajeAsientoEstado getViajeAsientoEstado() { return viajeAsientoEstado; }
    public void setViajeAsientoEstado(ViajeAsientoEstado v) { this.viajeAsientoEstado = v; }

    public String getTramo() { return tramo; }
    public void setTramo(String tramo) { this.tramo = tramo; }
}