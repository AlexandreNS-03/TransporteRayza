package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Cliente del público (comprador en línea). Entidad distinta de {@link Usuario}
 * (que representa al personal). Su login usa el mismo JWT con rol "CLIENTE".
 */
@Entity
@Table(name = "clientes")
public class Cliente {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, unique = true, length = 120)
    private String email;

    @Column(nullable = false, length = 100)
    private String password;

    @Column(length = 100)
    private String nombres;

    @Column(length = 100)
    private String apellidos;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_documento")
    private TipoDocumento tipoDocumento;

    @Column(name = "numero_documento", length = 20)
    private String numeroDocumento;

    @Column(name = "pais_documento", length = 2)
    private String paisDocumento;           // referencial (ISO-2), ej. PE

    @Column(name = "fecha_nacimiento")
    private LocalDate fechaNacimiento;

    @Column(name = "codigo_pais_telefono", length = 6)
    private String codigoPaisTelefono;      // ej. +51

    @Column(length = 20)
    private String telefono;

    /**
     * Género y nacionalidad los pide la Capitanía para el manifiesto de
     * pasajeros, así que se guardan en el perfil y no hay que escribirlos en
     * cada compra. No están por costumbre: tienen un uso concreto.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "genero", length = 12)
    private Genero genero;

    /** ISO-2 del país de nacionalidad (PE, CO, BR…). */
    @Column(name = "nacionalidad", length = 2)
    private String nacionalidad;

    /**
     * Cuándo quedó comprobado que el correo es suyo. Null = sin verificar.
     *
     * Importa más de lo que parece: el boleto y el comprobante llegan por ahí,
     * y las compras del cliente se juntan por correo. Un correo escrito mal —o
     * el de otra persona— rompe las dos cosas sin que nadie se entere.
     */
    @Column(name = "email_verificado_at")
    private LocalDateTime emailVerificadoAt;

    private Boolean activo;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "ultimo_login")
    private LocalDateTime ultimoLogin;

    public enum TipoDocumento { DNI, CE, PASAPORTE }

    /** "OTRO" existe porque el documento de alguna gente dice otra cosa. */
    public enum Genero { MASCULINO, FEMENINO, OTRO }

    public boolean tieneCorreoVerificado() { return emailVerificadoAt != null; }

    public Genero getGenero() { return genero; }
    public void setGenero(Genero genero) { this.genero = genero; }

    public String getNacionalidad() { return nacionalidad; }
    public void setNacionalidad(String nacionalidad) { this.nacionalidad = nacionalidad; }

    public LocalDateTime getEmailVerificadoAt() { return emailVerificadoAt; }
    public void setEmailVerificadoAt(LocalDateTime emailVerificadoAt) { this.emailVerificadoAt = emailVerificadoAt; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getNombres() { return nombres; }
    public void setNombres(String nombres) { this.nombres = nombres; }

    public String getApellidos() { return apellidos; }
    public void setApellidos(String apellidos) { this.apellidos = apellidos; }

    public TipoDocumento getTipoDocumento() { return tipoDocumento; }
    public void setTipoDocumento(TipoDocumento tipoDocumento) { this.tipoDocumento = tipoDocumento; }

    public String getNumeroDocumento() { return numeroDocumento; }
    public void setNumeroDocumento(String numeroDocumento) { this.numeroDocumento = numeroDocumento; }

    public String getPaisDocumento() { return paisDocumento; }
    public void setPaisDocumento(String paisDocumento) { this.paisDocumento = paisDocumento; }

    public LocalDate getFechaNacimiento() { return fechaNacimiento; }
    public void setFechaNacimiento(LocalDate fechaNacimiento) { this.fechaNacimiento = fechaNacimiento; }

    public String getCodigoPaisTelefono() { return codigoPaisTelefono; }
    public void setCodigoPaisTelefono(String codigoPaisTelefono) { this.codigoPaisTelefono = codigoPaisTelefono; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUltimoLogin() { return ultimoLogin; }
    public void setUltimoLogin(LocalDateTime ultimoLogin) { this.ultimoLogin = ultimoLogin; }
}
