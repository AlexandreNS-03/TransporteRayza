package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Permiso que un cliente dio una vez para que le cobremos por Yape después,
 * sin que tenga que abrir la app cada vez (lo que Yape llama
 * <em>credential on file</em>).
 *
 * Acá NO se guarda nada sensible: ni el celular completo, ni claves, ni datos
 * de la cuenta. Solo el identificador que devuelve el proveedor —el token— y
 * con qué cliente va. Si esta tabla se filtrara, lo único que se filtra es una
 * lista de correos y unos identificadores que sin las credenciales del
 * comercio no sirven para cobrarle a nadie.
 *
 * El ciclo es: PENDIENTE (se generó el enlace y se espera que la persona
 * apruebe en Yape) → ACTIVA (ya se puede cobrar) → REVOCADA (la dio de baja
 * el cliente o nosotros). De ACTIVA no se vuelve: para volver a cobrar hay
 * que pedir una autorización nueva.
 */
@Entity
@Table(name = "autorizaciones_yape")
public class AutorizacionYape {

    public enum Estado { PENDIENTE, ACTIVA, REVOCADA }

    @Id
    @Column(name = "id", length = 36)
    private String id;

    /** A quién le vamos a cobrar. Es la llave con la que la busca el sistema. */
    @Column(name = "cliente_email", nullable = false, length = 150)
    private String clienteEmail;

    @Column(name = "cliente_nombre", length = 150)
    private String clienteNombre;

    /**
     * Los últimos dígitos del celular, solo para que la persona reconozca cuál
     * de sus cuentas autorizó. Nunca el número completo.
     */
    @Column(name = "celular_final", length = 4)
    private String celularFinal;

    /** El identificador que devuelve el proveedor. Es lo que se manda al cobrar. */
    @Column(name = "token", length = 200)
    private String token;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private Estado estado = Estado.PENDIENTE;

    /** Referencia del proveedor para poder rastrear la autorización en su panel. */
    @Column(name = "referencia_externa", length = 120)
    private String referenciaExterna;

    @Column(name = "motivo_baja", length = 200)
    private String motivoBaja;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "autorizado_at")
    private LocalDateTime autorizadoAt;

    @Column(name = "revocado_at")
    private LocalDateTime revocadoAt;

    /** Solo se puede cobrar contra una autorización viva. */
    public boolean sirveParaCobrar() {
        return estado == Estado.ACTIVA && token != null && !token.isBlank();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getClienteEmail() { return clienteEmail; }
    public void setClienteEmail(String v) { this.clienteEmail = v == null ? null : v.trim().toLowerCase(); }

    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String v) { this.clienteNombre = v; }

    public String getCelularFinal() { return celularFinal; }
    public void setCelularFinal(String v) { this.celularFinal = v; }

    public String getToken() { return token; }
    public void setToken(String v) { this.token = v; }

    public Estado getEstado() { return estado; }
    public void setEstado(Estado v) { this.estado = v; }

    public String getReferenciaExterna() { return referenciaExterna; }
    public void setReferenciaExterna(String v) { this.referenciaExterna = v; }

    public String getMotivoBaja() { return motivoBaja; }
    public void setMotivoBaja(String v) { this.motivoBaja = v; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }

    public LocalDateTime getAutorizadoAt() { return autorizadoAt; }
    public void setAutorizadoAt(LocalDateTime v) { this.autorizadoAt = v; }

    public LocalDateTime getRevocadoAt() { return revocadoAt; }
    public void setRevocadoAt(LocalDateTime v) { this.revocadoAt = v; }
}
