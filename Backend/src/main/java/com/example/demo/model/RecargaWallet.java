package com.example.demo.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Una recarga de la wallet que el cliente empezó y todavía no pagó.
 *
 * <p>Existe por una sola razón: <strong>saber cuánto se esperaba cobrar antes
 * de que la pasarela conteste.</strong> Sin esto, al volver del pago habría que
 * creerle al navegador cuánto se pagó — y eso es regalar plata: se paga S/ 1 y
 * se pide acreditar S/ 1000.
 *
 * <p>Al confirmar se compara el monto que firma Izipay contra el que quedó
 * guardado acá. Si no coinciden, no se acredita nada.
 */
@Entity
@Table(name = "recargas_wallet")
public class RecargaWallet {

    public enum Estado { PENDIENTE, PAGADA, FALLIDA }

    /** También es el orderId que se le manda a la pasarela. */
    @Id
    @Column(name = "id", length = 60)
    private String id;

    @Column(name = "cliente_email", nullable = false, length = 150)
    private String clienteEmail;

    @Column(name = "monto", precision = 10, scale = 2, nullable = false)
    private BigDecimal monto;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 12)
    private Estado estado = Estado.PENDIENTE;

    /** La referencia que devolvió la pasarela, para poder rastrearlo. */
    @Column(name = "referencia_pasarela", length = 120)
    private String referenciaPasarela;

    @Column(name = "motivo_falla", length = 200)
    private String motivoFalla;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "pagada_at")
    private LocalDateTime pagadaAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getClienteEmail() { return clienteEmail; }
    public void setClienteEmail(String v) { this.clienteEmail = v; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public Estado getEstado() { return estado; }
    public void setEstado(Estado estado) { this.estado = estado; }
    public String getReferenciaPasarela() { return referenciaPasarela; }
    public void setReferenciaPasarela(String v) { this.referenciaPasarela = v; }
    public String getMotivoFalla() { return motivoFalla; }
    public void setMotivoFalla(String v) { this.motivoFalla = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
    public LocalDateTime getPagadaAt() { return pagadaAt; }
    public void setPagadaAt(LocalDateTime v) { this.pagadaAt = v; }
}
