package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notificaciones")
public class Notificacion {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "titulo", length = 200, nullable = false)
    private String titulo;

    @Column(name = "mensaje", columnDefinition = "TEXT", nullable = false)
    private String mensaje;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false)
    private Tipo tipo;

    @Column(name = "usuario_destino_id", length = 36)
    private String usuarioDestinoId;

    @Column(name = "sucursal_destino_id", length = 36)
    private String sucursalDestinoId;

    @Column(name = "modulo", length = 50)
    private String modulo;

    @Column(name = "referencia_id", length = 36)
    private String referenciaId;

    @Column(name = "leido", nullable = false)
    private Boolean leido;

    @Column(name = "leido_at")
    private LocalDateTime leidoAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public enum Tipo { INFO, WARNING, SUCCESS, ERROR }

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }

    public String getMensaje() { return mensaje; }
    public void setMensaje(String mensaje) { this.mensaje = mensaje; }

    public Tipo getTipo() { return tipo; }
    public void setTipo(Tipo tipo) { this.tipo = tipo; }

    public String getUsuarioDestinoId() { return usuarioDestinoId; }
    public void setUsuarioDestinoId(String usuarioDestinoId) { this.usuarioDestinoId = usuarioDestinoId; }

    public String getSucursalDestinoId() { return sucursalDestinoId; }
    public void setSucursalDestinoId(String sucursalDestinoId) { this.sucursalDestinoId = sucursalDestinoId; }

    public String getModulo() { return modulo; }
    public void setModulo(String modulo) { this.modulo = modulo; }

    public String getReferenciaId() { return referenciaId; }
    public void setReferenciaId(String referenciaId) { this.referenciaId = referenciaId; }

    public Boolean getLeido() { return leido; }
    public void setLeido(Boolean leido) { this.leido = leido; }

    public LocalDateTime getLeidoAt() { return leidoAt; }
    public void setLeidoAt(LocalDateTime leidoAt) { this.leidoAt = leidoAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
