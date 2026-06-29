package com.example.demo.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public class ViajeRequest {

    private String rutaId;
    private String embarcacionId;
    private String sucursalId;
    private LocalDate fechaSalida;
    private LocalTime horaSalida;

    // Getters y Setters
    public String getRutaId() { return rutaId; }
    public void setRutaId(String rutaId) { this.rutaId = rutaId; }

    public String getEmbarcacionId() { return embarcacionId; }
    public void setEmbarcacionId(String embarcacionId) { this.embarcacionId = embarcacionId; }

    public String getSucursalId() { return sucursalId; }
    public void setSucursalId(String sucursalId) { this.sucursalId = sucursalId; }

    public LocalDate getFechaSalida() { return fechaSalida; }
    public void setFechaSalida(LocalDate fechaSalida) { this.fechaSalida = fechaSalida; }

    public LocalTime getHoraSalida() { return horaSalida; }
    public void setHoraSalida(LocalTime horaSalida) { this.horaSalida = horaSalida; }
}