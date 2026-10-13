package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Un documento con el que el cliente puede viajar.
 *
 * <p>Son varios a propósito: el que vive en la frontera con Brasil viaja con
 * DNI a Iquitos y con pasaporte o CPF cuando cruza, y el que es extranjero
 * tiene carné y pasaporte. Guardarlos sueltos evita escribirlos en cada compra
 * y permite avisar antes de que venzan, que es el problema real — nadie se
 * acuerda del vencimiento hasta que está en el muelle.
 *
 * <p>Un número de documento es dato personal: se guarda porque hace falta para
 * emitir el pasaje y para el manifiesto, y el cliente puede borrarlo cuando
 * quiera.
 */
@Entity
@Table(name = "documentos_viaje")
public class DocumentoViaje {

    /** CPF está porque medio Loreto cruza a Brasil. */
    public enum Tipo { DNI, CE, PASAPORTE, CPF }

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "cliente_id", nullable = false, length = 36)
    private String clienteId;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, length = 12)
    private Tipo tipo;

    /** ISO-2 del país que lo emitió. */
    @Column(name = "pais_emision", length = 2)
    private String paisEmision;

    @Column(name = "numero", nullable = false, length = 30)
    private String numero;

    /** El DNI peruano vence; algunos documentos no. Por eso puede faltar. */
    @Column(name = "fecha_expiracion")
    private LocalDate fechaExpiracion;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public boolean estaVencido(LocalDate hoy) {
        return fechaExpiracion != null && fechaExpiracion.isBefore(hoy);
    }

    /** Vence pronto: el aviso tiene que llegar con tiempo de renovarlo. */
    public boolean venceDentroDe(LocalDate hoy, int dias) {
        return fechaExpiracion != null
                && !fechaExpiracion.isBefore(hoy)
                && !fechaExpiracion.isAfter(hoy.plusDays(dias));
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getClienteId() { return clienteId; }
    public void setClienteId(String clienteId) { this.clienteId = clienteId; }
    public Tipo getTipo() { return tipo; }
    public void setTipo(Tipo tipo) { this.tipo = tipo; }
    public String getPaisEmision() { return paisEmision; }
    public void setPaisEmision(String paisEmision) { this.paisEmision = paisEmision; }
    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }
    public LocalDate getFechaExpiracion() { return fechaExpiracion; }
    public void setFechaExpiracion(LocalDate fechaExpiracion) { this.fechaExpiracion = fechaExpiracion; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
