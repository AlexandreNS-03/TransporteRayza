package com.example.demo.model;

import jakarta.persistence.*;

/**
 * Un tramo de la ruta que no se debe vender (ej. el tramo directo que se salta
 * una parada intermedia nueva). A diferencia de RutaTarifaTramo, que fija un
 * precio, esto bloquea la venta del par origen-destino por completo.
 */
@Entity
@Table(name = "ruta_tramos_bloqueados")
public class RutaTramoBloqueado {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ruta_id")
    private Ruta ruta;

    @Column(name = "origen_tramo", length = 100)
    private String origenTramo;

    @Column(name = "destino_tramo", length = 100)
    private String destinoTramo;

    @Column(name = "orden_origen")
    private Integer ordenOrigen;

    @Column(name = "orden_destino")
    private Integer ordenDestino;

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Ruta getRuta() { return ruta; }
    public void setRuta(Ruta ruta) { this.ruta = ruta; }

    public String getOrigenTramo() { return origenTramo; }
    public void setOrigenTramo(String origenTramo) { this.origenTramo = origenTramo; }

    public String getDestinoTramo() { return destinoTramo; }
    public void setDestinoTramo(String destinoTramo) { this.destinoTramo = destinoTramo; }

    public Integer getOrdenOrigen() { return ordenOrigen; }
    public void setOrdenOrigen(Integer ordenOrigen) { this.ordenOrigen = ordenOrigen; }

    public Integer getOrdenDestino() { return ordenDestino; }
    public void setOrdenDestino(Integer ordenDestino) { this.ordenDestino = ordenDestino; }
}
