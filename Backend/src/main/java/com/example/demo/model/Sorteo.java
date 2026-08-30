package com.example.demo.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Sorteo promocional: un pasaje gratis entre quienes viajaron.
 *
 * OJO con lo legal: un sorteo en Perú necesita autorización y bases publicadas
 * (organizador, premio y su valor, fecha y hora, mecánica). Este modelo guarda
 * esos datos para poder mostrarlos, pero el trámite es de la empresa.
 *
 * El ganador se elige EN EL SERVIDOR y queda guardado acá con su fecha. La
 * ruleta que gira en pantalla es solo la animación: si el navegador eligiera,
 * cualquiera con la consola abierta podría ganar, y ante un reclamo no habría
 * cómo probar que fue limpio.
 */
@Entity
@Table(name = "sorteos")
public class Sorteo {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "nombre", length = 150)
    private String nombre;

    @Column(name = "premio", length = 300)
    private String premio;

    /** Valor comercial del premio: las bases lo exigen. */
    @Column(name = "premio_valor", precision = 10, scale = 2)
    private java.math.BigDecimal premioValor;

    /** Fecha y hora anunciadas. Las bases piden que sean exactas. */
    @Column(name = "fecha_sorteo")
    private LocalDateTime fechaSorteo;

    @Column(name = "bases_url", length = 300)
    private String basesUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private Estado estado;

    /** El cupón ganador. Se llena al ejecutar y ya no se toca. */
    @Column(name = "cupon_ganador_id", length = 36)
    private String cuponGanadorId;

    @Column(name = "sorteado_at")
    private LocalDateTime sorteadoAt;

    @Column(name = "sorteado_por", length = 100)
    private String sorteadoPor;

    /** Cuántos cupones entraron al momento del sorteo, para poder auditarlo. */
    @Column(name = "cupones_participantes")
    private Integer cuponesParticipantes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /**
     * BORRADOR  se está preparando, no acepta registros
     * ABIERTO   la gente puede registrar sus códigos
     * CERRADO   ya no entran más, falta ejecutarlo
     * SORTEADO  hay ganador; no se puede volver a sortear
     */
    public enum Estado { BORRADOR, ABIERTO, CERRADO, SORTEADO }

    public String getId() { return id; }
    public void setId(String v) { this.id = v; }
    public String getNombre() { return nombre; }
    public void setNombre(String v) { this.nombre = v; }
    public String getPremio() { return premio; }
    public void setPremio(String v) { this.premio = v; }
    public java.math.BigDecimal getPremioValor() { return premioValor; }
    public void setPremioValor(java.math.BigDecimal v) { this.premioValor = v; }
    public LocalDateTime getFechaSorteo() { return fechaSorteo; }
    public void setFechaSorteo(LocalDateTime v) { this.fechaSorteo = v; }
    public String getBasesUrl() { return basesUrl; }
    public void setBasesUrl(String v) { this.basesUrl = v; }
    public Estado getEstado() { return estado; }
    public void setEstado(Estado v) { this.estado = v; }
    public String getCuponGanadorId() { return cuponGanadorId; }
    public void setCuponGanadorId(String v) { this.cuponGanadorId = v; }
    public LocalDateTime getSorteadoAt() { return sorteadoAt; }
    public void setSorteadoAt(LocalDateTime v) { this.sorteadoAt = v; }
    public String getSorteadoPor() { return sorteadoPor; }
    public void setSorteadoPor(String v) { this.sorteadoPor = v; }
    public Integer getCuponesParticipantes() { return cuponesParticipantes; }
    public void setCuponesParticipantes(Integer v) { this.cuponesParticipantes = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
}
