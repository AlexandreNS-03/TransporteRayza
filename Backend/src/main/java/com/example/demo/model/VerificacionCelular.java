package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * El código que se le manda al celular para comprobar que es suyo.
 *
 * <p>Un código de seis dígitos es adivinable: hay un millón de combinaciones y
 * probar es gratis. Por eso acá lo que importa no es solo que venza, sino que
 * <strong>cuente los intentos</strong>: a los cinco fallos el código muere, haya
 * vencido o no. Sin eso, seis dígitos no protegen nada.
 *
 * <p>Del código se guarda el hash, nunca el código. Vive diez minutos: es algo
 * que la persona tiene en la mano y copia en el momento, no un enlace que puede
 * abrir mañana.
 */
@Entity
@Table(name = "verificaciones_celular")
public class VerificacionCelular {

    public enum Canal { SMS, WHATSAPP }

    /** Fallos permitidos antes de que el código deje de servir. */
    public static final int INTENTOS_PERMITIDOS = 5;

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "codigo_hash", nullable = false, length = 64)
    private String codigoHash;

    @Column(name = "cliente_id", nullable = false, length = 36)
    private String clienteId;

    /** El número al que se mandó, completo. Si después cambia, este ya no vale. */
    @Column(name = "telefono", nullable = false, length = 26)
    private String telefono;

    @Enumerated(EnumType.STRING)
    @Column(name = "canal", length = 12)
    private Canal canal;

    @Column(name = "intentos", nullable = false)
    private int intentos = 0;

    @Column(name = "expira_at", nullable = false)
    private LocalDateTime expiraAt;

    @Column(name = "usado_at")
    private LocalDateTime usadoAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public boolean estaVigente(LocalDateTime ahora) {
        return usadoAt == null
            && intentos < INTENTOS_PERMITIDOS
            && expiraAt != null
            && ahora.isBefore(expiraAt);
    }

    public int intentosQueQuedan() {
        return Math.max(0, INTENTOS_PERMITIDOS - intentos);
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getCodigoHash() { return codigoHash; }
    public void setCodigoHash(String v) { this.codigoHash = v; }
    public String getClienteId() { return clienteId; }
    public void setClienteId(String v) { this.clienteId = v; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String v) { this.telefono = v; }
    public Canal getCanal() { return canal; }
    public void setCanal(Canal canal) { this.canal = canal; }
    public int getIntentos() { return intentos; }
    public void setIntentos(int intentos) { this.intentos = intentos; }
    public LocalDateTime getExpiraAt() { return expiraAt; }
    public void setExpiraAt(LocalDateTime v) { this.expiraAt = v; }
    public LocalDateTime getUsadoAt() { return usadoAt; }
    public void setUsadoAt(LocalDateTime v) { this.usadoAt = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
}
