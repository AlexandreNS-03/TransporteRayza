package com.example.demo.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Código de un solo uso para el segundo factor del personal.
 *
 * Se guarda el HASH del código, no el código: son 6 dígitos, así que quien
 * pudiera leer esta tabla entraría a cualquier cuenta sin tocar el correo.
 *
 * Lleva la cuenta de intentos porque un código de 6 dígitos se adivina a la
 * fuerza en un millón de pruebas, y eso una máquina lo hace en minutos si nadie
 * la frena.
 */
@Entity
@Table(name = "codigos_verificacion")
public class CodigoVerificacion {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "usuario_id", nullable = false, length = 36)
    private String usuarioId;

    @Column(name = "codigo_hash", nullable = false, length = 64)
    private String codigoHash;

    @Column(name = "expira_at", nullable = false)
    private LocalDateTime expiraAt;

    @Column(name = "intentos", nullable = false)
    private Integer intentos = 0;

    @Column(name = "usado_at")
    private LocalDateTime usadoAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /** Cuántas veces se puede errar antes de tener que pedir otro código. */
    public static final int MAX_INTENTOS = 5;

    public boolean estaVigente() {
        return usadoAt == null
                && intentos != null && intentos < MAX_INTENTOS
                && expiraAt != null && LocalDateTime.now().isBefore(expiraAt);
    }

    public String getId() { return id; }
    public void setId(String v) { this.id = v; }
    public String getUsuarioId() { return usuarioId; }
    public void setUsuarioId(String v) { this.usuarioId = v; }
    public String getCodigoHash() { return codigoHash; }
    public void setCodigoHash(String v) { this.codigoHash = v; }
    public LocalDateTime getExpiraAt() { return expiraAt; }
    public void setExpiraAt(LocalDateTime v) { this.expiraAt = v; }
    public Integer getIntentos() { return intentos; }
    public void setIntentos(Integer v) { this.intentos = v; }
    public LocalDateTime getUsadoAt() { return usadoAt; }
    public void setUsadoAt(LocalDateTime v) { this.usadoAt = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
}
