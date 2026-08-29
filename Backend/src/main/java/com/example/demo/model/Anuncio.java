package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "anuncios")
public class Anuncio {

    public enum Tipo { BARRA, MODAL, LANDING }

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "titulo", length = 150)
    private String titulo;

    /* TEXT y no VARCHAR(500): un aviso de fuerza mayor o una disculpa a los
       pasajeros no entra en 500 caracteres, y al pasarse la base lo rechazaba
       con un error que hablaba de registros duplicados. */
    @Column(name = "mensaje", columnDefinition = "TEXT")
    private String mensaje;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", length = 20)
    private Tipo tipo;

    @Column(name = "texto_enlace", length = 60)
    private String textoEnlace;

    @Column(name = "url_enlace", length = 300)
    private String urlEnlace;

    @Column(name = "activo")
    private Boolean activo;

    @Column(name = "fecha_inicio")
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin")
    private LocalDate fechaFin;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }

    public String getMensaje() { return mensaje; }
    public void setMensaje(String mensaje) { this.mensaje = mensaje; }

    public Tipo getTipo() { return tipo; }
    public void setTipo(Tipo tipo) { this.tipo = tipo; }

    public String getTextoEnlace() { return textoEnlace; }
    public void setTextoEnlace(String textoEnlace) { this.textoEnlace = textoEnlace; }

    public String getUrlEnlace() { return urlEnlace; }
    public void setUrlEnlace(String urlEnlace) { this.urlEnlace = urlEnlace; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public LocalDate getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDate fechaInicio) { this.fechaInicio = fechaInicio; }

    public LocalDate getFechaFin() { return fechaFin; }
    public void setFechaFin(LocalDate fechaFin) { this.fechaFin = fechaFin; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
