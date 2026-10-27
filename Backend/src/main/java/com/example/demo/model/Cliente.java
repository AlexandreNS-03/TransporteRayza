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

    /* ── Contacto de emergencia ──
       Va en la cuenta y no en cada compra porque es el mismo siempre, y porque
       el día que haga falta nadie va a tener tiempo de buscarlo. En un viaje de
       ocho horas por el río no es un campo de formulario: es a quién se llama. */

    @Column(name = "emergencia_nombres", length = 150)
    private String emergenciaNombres;

    @Column(name = "emergencia_apellidos", length = 150)
    private String emergenciaApellidos;

    /** Madre, padre, hermano, pareja… Texto libre: las familias son como son. */
    @Column(name = "emergencia_relacion", length = 40)
    private String emergenciaRelacion;

    @Column(name = "emergencia_codigo_pais", length = 6)
    private String emergenciaCodigoPais;

    @Column(name = "emergencia_telefono", length = 20)
    private String emergenciaTelefono;

    /**
     * Cuándo quedó comprobado que el correo es suyo. Null = sin verificar.
     *
     * Importa más de lo que parece: el boleto y el comprobante llegan por ahí,
     * y las compras del cliente se juntan por correo. Un correo escrito mal —o
     * el de otra persona— rompe las dos cosas sin que nadie se entere.
     */
    @Column(name = "email_verificado_at")
    private LocalDateTime emailVerificadoAt;

    /**
     * Cuándo quedó comprobado que el celular es suyo. Null = sin verificar.
     *
     * Se pierde si cambia el número: lo que se verificó fue ese teléfono, no la
     * persona. Dejarlo marcado después de un cambio sería decir que comprobamos
     * algo que no comprobamos.
     */
    @Column(name = "telefono_verificado_at")
    private LocalDateTime telefonoVerificadoAt;

    private Boolean activo;

    /**
     * El código de pasajero frecuente, tipo RZ-7K3M9Q. Se asigna la primera vez
     * que el cliente entra a su cuenta, no al registrarse: así lo tienen también
     * las cuentas que ya existían.
     */
    @Column(name = "codigo_pasajero", length = 12, unique = true)
    private String codigoPasajero;

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

    /** ¿Hay a quién llamar? El teléfono es lo único imprescindible. */
    public boolean tieneContactoDeEmergencia() {
        return emergenciaTelefono != null && !emergenciaTelefono.isBlank();
    }

    public String getEmergenciaNombres() { return emergenciaNombres; }
    public void setEmergenciaNombres(String v) { this.emergenciaNombres = v; }

    public String getEmergenciaApellidos() { return emergenciaApellidos; }
    public void setEmergenciaApellidos(String v) { this.emergenciaApellidos = v; }

    public String getEmergenciaRelacion() { return emergenciaRelacion; }
    public void setEmergenciaRelacion(String v) { this.emergenciaRelacion = v; }

    public String getEmergenciaCodigoPais() { return emergenciaCodigoPais; }
    public void setEmergenciaCodigoPais(String v) { this.emergenciaCodigoPais = v; }

    public String getEmergenciaTelefono() { return emergenciaTelefono; }
    public void setEmergenciaTelefono(String v) { this.emergenciaTelefono = v; }

    public LocalDateTime getEmailVerificadoAt() { return emailVerificadoAt; }
    public void setEmailVerificadoAt(LocalDateTime emailVerificadoAt) { this.emailVerificadoAt = emailVerificadoAt; }

    public boolean tieneCelularVerificado() { return telefonoVerificadoAt != null; }

    public LocalDateTime getTelefonoVerificadoAt() { return telefonoVerificadoAt; }
    public void setTelefonoVerificadoAt(LocalDateTime v) { this.telefonoVerificadoAt = v; }

    /** El número completo, como se marca. */
    public String celularCompleto() {
        String cod = codigoPaisTelefono == null || codigoPaisTelefono.isBlank() ? "+51" : codigoPaisTelefono.trim();
        return cod + (telefono == null ? "" : telefono.trim());
    }

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

    public String getCodigoPasajero() { return codigoPasajero; }
    public void setCodigoPasajero(String v) { this.codigoPasajero = v; }

    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUltimoLogin() { return ultimoLogin; }
    public void setUltimoLogin(LocalDateTime ultimoLogin) { this.ultimoLogin = ultimoLogin; }
}
