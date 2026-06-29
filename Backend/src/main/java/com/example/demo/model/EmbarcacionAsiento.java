package com.example.demo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "embarcacion_asientos")
public class EmbarcacionAsiento {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "embarcacion_id")
    private Embarcacion embarcacion;

    @Column(name = "numero")
    private Integer numero;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo")
    private TipoAsiento tipo;

    public enum TipoAsiento { NORMAL, VIP }

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Embarcacion getEmbarcacion() { return embarcacion; }
    public void setEmbarcacion(Embarcacion embarcacion) { this.embarcacion = embarcacion; }

    public Integer getNumero() { return numero; }
    public void setNumero(Integer numero) { this.numero = numero; }

    public TipoAsiento getTipo() { return tipo; }
    public void setTipo(TipoAsiento tipo) { this.tipo = tipo; }
}