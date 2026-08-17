package com.example.demo.dto;

public class AnuncioDTO {

    private String id;
    private String titulo;
    private String mensaje;
    private String tipo;
    private String textoEnlace;
    private String urlEnlace;
    private Boolean activo;
    private String fechaInicio;
    private String fechaFin;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }

    public String getMensaje() { return mensaje; }
    public void setMensaje(String mensaje) { this.mensaje = mensaje; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getTextoEnlace() { return textoEnlace; }
    public void setTextoEnlace(String textoEnlace) { this.textoEnlace = textoEnlace; }

    public String getUrlEnlace() { return urlEnlace; }
    public void setUrlEnlace(String urlEnlace) { this.urlEnlace = urlEnlace; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public String getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(String fechaInicio) { this.fechaInicio = fechaInicio; }

    public String getFechaFin() { return fechaFin; }
    public void setFechaFin(String fechaFin) { this.fechaFin = fechaFin; }
}
