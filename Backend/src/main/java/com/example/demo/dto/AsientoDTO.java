package com.example.demo.dto;

import java.util.List;

public class AsientoDTO {

    private String id;
    private Integer numero;
    private String tipo;
    private String estado;
    private String pasajeroNombre;
    private String pasajeroDoc;
    private List<String> tramosOcupados;

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Integer getNumero() { return numero; }
    public void setNumero(Integer numero) { this.numero = numero; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getPasajeroNombre() { return pasajeroNombre; }
    public void setPasajeroNombre(String pasajeroNombre) { this.pasajeroNombre = pasajeroNombre; }

    public String getPasajeroDoc() { return pasajeroDoc; }
    public void setPasajeroDoc(String pasajeroDoc) { this.pasajeroDoc = pasajeroDoc; }

    public List<String> getTramosOcupados() { return tramosOcupados; }
    public void setTramosOcupados(List<String> tramosOcupados) { this.tramosOcupados = tramosOcupados; }
}