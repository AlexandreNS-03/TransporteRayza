package com.example.demo.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Un premio de un sorteo.
 *
 * Existe para que un mismo sorteo pueda repartir varios premios con los mismos
 * participantes y el mismo registro: la rueda gira una vez por premio, del
 * último al primero, y cada giro elige entre quienes todavía no ganaron.
 *
 * Cada premio se sortea por separado y queda grabado apenas se decide. Si la
 * transmisión se corta a mitad, lo ya sorteado está firme y se sigue desde ahí:
 * volver a sortear un premio ya entregado sería quitárselo a alguien.
 *
 * El valor va acá y no en el sorteo porque las bases exigen el valor de CADA
 * premio, no el del conjunto.
 */
@Entity
@Table(name = "premios_sorteo")
public class PremioSorteo {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "sorteo_id", nullable = false, length = 36)
    private String sorteoId;

    /**
     * 1 es el premio mayor. Se sortea de mayor número a menor —tercero,
     * segundo, primero— porque anunciar el premio grande al final es lo que
     * sostiene la atención.
     */
    @Column(name = "orden", nullable = false)
    private Integer orden;

    @Column(name = "descripcion", length = 300)
    private String descripcion;

    @Column(name = "valor", precision = 10, scale = 2)
    private BigDecimal valor;

    /** El cupón ganador. Se llena al sortear este premio y ya no se toca. */
    @Column(name = "cupon_ganador_id", length = 36)
    private String cuponGanadorId;

    @Column(name = "sorteado_at")
    private LocalDateTime sorteadoAt;

    @Column(name = "sorteado_por", length = 100)
    private String sorteadoPor;

    public boolean estaSorteado() { return cuponGanadorId != null; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSorteoId() { return sorteoId; }
    public void setSorteoId(String v) { this.sorteoId = v; }

    public Integer getOrden() { return orden; }
    public void setOrden(Integer v) { this.orden = v; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String v) { this.descripcion = v; }

    public BigDecimal getValor() { return valor; }
    public void setValor(BigDecimal v) { this.valor = v; }

    public String getCuponGanadorId() { return cuponGanadorId; }
    public void setCuponGanadorId(String v) { this.cuponGanadorId = v; }

    public LocalDateTime getSorteadoAt() { return sorteadoAt; }
    public void setSorteadoAt(LocalDateTime v) { this.sorteadoAt = v; }

    public String getSorteadoPor() { return sorteadoPor; }
    public void setSorteadoPor(String v) { this.sorteadoPor = v; }
}
