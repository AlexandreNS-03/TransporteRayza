package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Los intentos fallidos de entrar, por usuario y por dirección.
 *
 * <p>Esto vivía en un mapa en memoria, y ahí tenía dos agujeros que no se ven
 * mirando el código: <strong>cada despliegue de Railway reiniciaba los
 * contadores</strong> —y quien está probando contraseñas no necesita más que
 * esperar al próximo— y, el día que haya dos instancias, cada una contaría por
 * su lado, así que la tolerancia real sería el doble.
 *
 * <p>La llave es el texto por el que se cuenta: {@code usuario:pedro},
 * {@code ip:190.x.x.x} o {@code ip-publica:190.x.x.x}. No se guarda nada más
 * del intento —ni la contraseña probada, ni el agente— porque para frenar
 * alcanza con contar.
 */
@Entity
@Table(name = "intentos_login")
public class IntentoLogin {

    @Id
    @Column(name = "llave", length = 190)
    private String llave;

    /** Fallos seguidos desde el último éxito o el último bloqueo. */
    @Column(name = "fallos", nullable = false)
    private int fallos;

    /** Cuántas veces ya se bloqueó esta llave: cada vez el bloqueo dura más. */
    @Column(name = "bloqueos", nullable = false)
    private int bloqueos;

    @Column(name = "ultimo_fallo")
    private LocalDateTime ultimoFallo;

    @Column(name = "bloqueado_hasta")
    private LocalDateTime bloqueadoHasta;

    public String getLlave() { return llave; }
    public void setLlave(String v) { this.llave = v; }
    public int getFallos() { return fallos; }
    public void setFallos(int v) { this.fallos = v; }
    public int getBloqueos() { return bloqueos; }
    public void setBloqueos(int v) { this.bloqueos = v; }
    public LocalDateTime getUltimoFallo() { return ultimoFallo; }
    public void setUltimoFallo(LocalDateTime v) { this.ultimoFallo = v; }
    public LocalDateTime getBloqueadoHasta() { return bloqueadoHasta; }
    public void setBloqueadoHasta(LocalDateTime v) { this.bloqueadoHasta = v; }
}
