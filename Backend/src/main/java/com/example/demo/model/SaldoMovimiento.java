package com.example.demo.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Billetera del cliente: cada fila es un movimiento de saldo a favor.
 * El saldo disponible es la suma de los montos (positivos = a favor,
 * negativos = usados en una compra). Se lleva como movimientos y no como
 * un número suelto para poder auditar de dónde salió cada sol.
 *
 * Se identifica por correo porque la mayoría compra como invitado, sin cuenta.
 */
@Entity
@Table(name = "saldo_movimientos")
public class SaldoMovimiento {

    @Id
    @Column(length = 36)
    private String id;

    /** Correo del cliente en minúsculas: es la llave de la billetera. */
    @Column(name = "cliente_email", length = 100, nullable = false)
    private String clienteEmail;

    @Column(name = "cliente_documento", length = 20)
    private String clienteDocumento;

    @Column(name = "cliente_nombre", length = 150)
    private String clienteNombre;

    /** Positivo = se acredita saldo; negativo = se usa. */
    @Column(name = "monto", precision = 10, scale = 2, nullable = false)
    private BigDecimal monto;

    @Column(name = "motivo", length = 250)
    private String motivo;

    /** Venta que originó el movimiento (el pasaje del viaje cancelado). */
    @Column(name = "venta_id", length = 36)
    private String ventaId;

    @Column(name = "usuario_nombre", length = 150)
    private String usuarioNombre;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getClienteEmail() { return clienteEmail; }
    public void setClienteEmail(String v) { this.clienteEmail = v; }

    public String getClienteDocumento() { return clienteDocumento; }
    public void setClienteDocumento(String v) { this.clienteDocumento = v; }

    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String v) { this.clienteNombre = v; }

    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal v) { this.monto = v; }

    public String getMotivo() { return motivo; }
    public void setMotivo(String v) { this.motivo = v; }

    public String getVentaId() { return ventaId; }
    public void setVentaId(String v) { this.ventaId = v; }

    public String getUsuarioNombre() { return usuarioNombre; }
    public void setUsuarioNombre(String v) { this.usuarioNombre = v; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
}
