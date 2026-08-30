package com.example.demo.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Cupón de participación. Su código va impreso en el ticket de embarque.
 *
 * Cada pasaje vendido genera uno. Un asiento VIP pesa 2: entra al sorteo con el
 * doble de probabilidad, que es lo que hace que el VIP valga la pena.
 *
 * Nace SIN registrar: participa recién cuando la persona escribe el código en la
 * web y deja cómo ubicarla. Sin eso no habría a quién avisarle si gana.
 */
@Entity
@Table(name = "cupones_sorteo")
public class CuponSorteo {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "sorteo_id", nullable = false, length = 36)
    private String sorteoId;

    /** Lo que se imprime en el ticket. Corto y sin caracteres que se confundan. */
    @Column(name = "codigo", nullable = false, unique = true, length = 20)
    private String codigo;

    @Column(name = "venta_id", length = 36)
    private String ventaId;

    @Column(name = "pasajero_nombre", length = 150)
    private String pasajeroNombre;

    @Column(name = "pasajero_documento", length = 20)
    private String pasajeroDocumento;

    /** 1 para asiento normal, 2 para VIP. */
    @Column(name = "peso", nullable = false)
    private Integer peso;

    @Column(name = "registrado_at")
    private LocalDateTime registradoAt;

    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "telefono", length = 30)
    private String telefono;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public boolean estaRegistrado() { return registradoAt != null; }

    public String getId() { return id; }
    public void setId(String v) { this.id = v; }
    public String getSorteoId() { return sorteoId; }
    public void setSorteoId(String v) { this.sorteoId = v; }
    public String getCodigo() { return codigo; }
    public void setCodigo(String v) { this.codigo = v; }
    public String getVentaId() { return ventaId; }
    public void setVentaId(String v) { this.ventaId = v; }
    public String getPasajeroNombre() { return pasajeroNombre; }
    public void setPasajeroNombre(String v) { this.pasajeroNombre = v; }
    public String getPasajeroDocumento() { return pasajeroDocumento; }
    public void setPasajeroDocumento(String v) { this.pasajeroDocumento = v; }
    public Integer getPeso() { return peso; }
    public void setPeso(Integer v) { this.peso = v; }
    public LocalDateTime getRegistradoAt() { return registradoAt; }
    public void setRegistradoAt(LocalDateTime v) { this.registradoAt = v; }
    public String getEmail() { return email; }
    public void setEmail(String v) { this.email = v; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String v) { this.telefono = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
}
