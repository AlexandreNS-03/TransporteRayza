package com.example.demo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "venta_tramos_usados")
public class VentaTramoUsado {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venta_id")
    private Venta venta;

    @Column(name = "tramo", length = 10)
    private String tramo;

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Venta getVenta() { return venta; }
    public void setVenta(Venta venta) { this.venta = venta; }

    public String getTramo() { return tramo; }
    public void setTramo(String tramo) { this.tramo = tramo; }
}