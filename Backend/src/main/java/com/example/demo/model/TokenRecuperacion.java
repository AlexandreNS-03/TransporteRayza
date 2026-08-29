package com.example.demo.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Enlace de un solo uso para recuperar la contraseña.
 *
 * Lo que se guarda es el HASH del token, nunca el token en claro: si alguien
 * llegara a leer esta tabla, no podría armar los enlaces y entrar a las cuentas.
 * El token real solo viaja en el correo del dueño.
 *
 * Sirve tanto para clientes de la web como para el personal del sistema, por eso
 * guarda a quién pertenece y de qué tipo es.
 */
@Entity
@Table(name = "tokens_recuperacion")
public class TokenRecuperacion {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    /** SHA-256 del token que viajó por correo. */
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "cuenta_id", nullable = false, length = 36)
    private String cuentaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_cuenta", nullable = false, length = 20)
    private TipoCuenta tipoCuenta;

    @Column(name = "expira_at", nullable = false)
    private LocalDateTime expiraAt;

    /** Cuándo se usó. Nulo mientras siga válido; un token no se usa dos veces. */
    @Column(name = "usado_at")
    private LocalDateTime usadoAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public enum TipoCuenta { CLIENTE, USUARIO }

    public boolean estaVigente() {
        return usadoAt == null && expiraAt != null && LocalDateTime.now().isBefore(expiraAt);
    }

    public String getId() { return id; }
    public void setId(String v) { this.id = v; }
    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String v) { this.tokenHash = v; }
    public String getCuentaId() { return cuentaId; }
    public void setCuentaId(String v) { this.cuentaId = v; }
    public TipoCuenta getTipoCuenta() { return tipoCuenta; }
    public void setTipoCuenta(TipoCuenta v) { this.tipoCuenta = v; }
    public LocalDateTime getExpiraAt() { return expiraAt; }
    public void setExpiraAt(LocalDateTime v) { this.expiraAt = v; }
    public LocalDateTime getUsadoAt() { return usadoAt; }
    public void setUsadoAt(LocalDateTime v) { this.usadoAt = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
}
