package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * El enlace que se le manda al cliente para comprobar que el correo es suyo.
 *
 * <p>Tiene su propia tabla, separada de la de recuperar contraseña, y no es por
 * prolijidad: si los dos usos compartieran tabla, un enlace pensado para
 * confirmar un correo podría terminar sirviendo para cambiar una contraseña.
 * Esa clase de confusión es un agujero clásico y se evita no dándole la
 * oportunidad.
 *
 * <p>Del token se guarda el hash, nunca el token: si esta tabla se filtrara, lo
 * que se filtra no sirve para verificar nada.
 */
@Entity
@Table(name = "verificaciones_email")
public class VerificacionEmail {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Column(name = "cliente_id", nullable = false, length = 36)
    private String clienteId;

    /** El correo que se está verificando, por si después cambia. */
    @Column(name = "email", nullable = false, length = 150)
    private String email;

    @Column(name = "expira_at", nullable = false)
    private LocalDateTime expiraAt;

    /** Se llena al usarlo. Un enlace sirve una sola vez. */
    @Column(name = "usado_at")
    private LocalDateTime usadoAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public boolean estaVigente(LocalDateTime ahora) {
        return usadoAt == null && expiraAt != null && ahora.isBefore(expiraAt);
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }
    public String getClienteId() { return clienteId; }
    public void setClienteId(String clienteId) { this.clienteId = clienteId; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public LocalDateTime getExpiraAt() { return expiraAt; }
    public void setExpiraAt(LocalDateTime expiraAt) { this.expiraAt = expiraAt; }
    public LocalDateTime getUsadoAt() { return usadoAt; }
    public void setUsadoAt(LocalDateTime usadoAt) { this.usadoAt = usadoAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
