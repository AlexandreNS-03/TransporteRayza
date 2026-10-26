package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;

/**
 * Alguien con quien el cliente suele viajar, guardado para no escribir sus
 * datos en cada compra.
 *
 * <p><strong>Son datos de otra persona.</strong> El que los carga es el titular
 * de la cuenta, no el acompañante, así que acá se guarda lo mínimo que hace
 * falta para emitir un pasaje y nada más: lo mismo que ya se escribe al
 * comprar. No hay correo, ni dirección, ni nada que sirva para contactar a esa
 * persona por nuestra cuenta.
 *
 * <p>Se guarda la <em>fecha de nacimiento</em> y no la edad a propósito. Una
 * edad guardada queda mal al año siguiente sin que nadie lo note, y la edad va
 * al manifiesto: un dato que envejece solo es un dato que miente.
 */
@Entity
@Table(name = "acompanantes_frecuentes")
public class AcompananteFrecuente {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    /** De quién es la lista. */
    @Column(name = "cliente_id", nullable = false, length = 36)
    private String clienteId;

    /** Nombre y apellidos juntos, como los pide el formulario de compra. */
    @Column(name = "nombre_completo", nullable = false, length = 150)
    private String nombreCompleto;

    @Column(name = "tipo_documento", nullable = false, length = 12)
    private String tipoDocumento;

    @Column(name = "numero_documento", nullable = false, length = 30)
    private String numeroDocumento;

    @Column(name = "fecha_nacimiento")
    private LocalDate fechaNacimiento;

    /** "Masculino" | "Femenino" | "Otro", como lo guarda la venta. */
    @Column(name = "sexo", length = 12)
    private String sexo;

    @Column(name = "telefono", length = 20)
    private String telefono;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** La edad de hoy, calculada. Nunca se guarda. */
    public Integer edadAl(LocalDate hoy) {
        if (fechaNacimiento == null || fechaNacimiento.isAfter(hoy)) return null;
        return Period.between(fechaNacimiento, hoy).getYears();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getClienteId() { return clienteId; }
    public void setClienteId(String clienteId) { this.clienteId = clienteId; }
    public String getNombreCompleto() { return nombreCompleto; }
    public void setNombreCompleto(String v) { this.nombreCompleto = v; }
    public String getTipoDocumento() { return tipoDocumento; }
    public void setTipoDocumento(String v) { this.tipoDocumento = v; }
    public String getNumeroDocumento() { return numeroDocumento; }
    public void setNumeroDocumento(String v) { this.numeroDocumento = v; }
    public LocalDate getFechaNacimiento() { return fechaNacimiento; }
    public void setFechaNacimiento(LocalDate v) { this.fechaNacimiento = v; }
    public String getSexo() { return sexo; }
    public void setSexo(String sexo) { this.sexo = sexo; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
