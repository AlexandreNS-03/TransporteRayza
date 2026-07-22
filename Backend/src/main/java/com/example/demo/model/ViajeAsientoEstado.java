package com.example.demo.model;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "viaje_asientos_estado")
public class ViajeAsientoEstado {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "viaje_id", length = 36)
    private String viajeId;

    @Column(name = "numero")
    private Integer numero;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo")
    private TipoAsiento tipo;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado")
    private EstadoAsiento estado;

    @Column(name = "venta_id", length = 36)
    private String ventaId;

    @Column(name = "pasajero_nombre", length = 150)
    private String pasajeroNombre;

    @Column(name = "pasajero_doc", length = 20)
    private String pasajeroDoc;

    @Column(name = "pasajero_tel", length = 20)
    private String pasajeroTel;

    @OneToMany(mappedBy = "viajeAsientoEstado", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<ViajeAsientoTramoOcupado> tramosOcupados;

    public enum TipoAsiento { NORMAL, VIP }
    public enum EstadoAsiento { LIBRE, VENDIDO, RESERVADO }

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getViajeId() { return viajeId; }
    public void setViajeId(String viajeId) { this.viajeId = viajeId; }

    public Integer getNumero() { return numero; }
    public void setNumero(Integer numero) { this.numero = numero; }

    public TipoAsiento getTipo() { return tipo; }
    public void setTipo(TipoAsiento tipo) { this.tipo = tipo; }

    public EstadoAsiento getEstado() { return estado; }
    public void setEstado(EstadoAsiento estado) { this.estado = estado; }

    public String getVentaId() { return ventaId; }
    public void setVentaId(String ventaId) { this.ventaId = ventaId; }

    public String getPasajeroNombre() { return pasajeroNombre; }
    public void setPasajeroNombre(String pasajeroNombre) { this.pasajeroNombre = pasajeroNombre; }

    public String getPasajeroDoc() { return pasajeroDoc; }
    public void setPasajeroDoc(String pasajeroDoc) { this.pasajeroDoc = pasajeroDoc; }

    public String getPasajeroTel() { return pasajeroTel; }
    public void setPasajeroTel(String pasajeroTel) { this.pasajeroTel = pasajeroTel; }

    public List<ViajeAsientoTramoOcupado> getTramosOcupados() { return tramosOcupados; }
    public void setTramosOcupados(List<ViajeAsientoTramoOcupado> tramosOcupados) { this.tramosOcupados = tramosOcupados; }
}