package com.example.demo.dto;

import java.math.BigDecimal;

/**
 * Vista pública (sin login) de un viaje disponible. Representa un TRAMO concreto
 * (origen→destino elegidos), con su precio y asientos libres para ese tramo.
 * Incluye vipPosicion y capitan para dibujar el mapa de asientos igual que el
 * sistema de ventas.
 */
public class PublicViajeDTO {

    /** Paradas del tramo comprado con su hora estimada de paso. */
    public static class Escala {
        private String nombre;
        private Integer orden;
        private String horaEstimada;   // HH:mm, calculada desde la salida
        public Escala(String nombre, Integer orden, String horaEstimada) {
            this.nombre = nombre; this.orden = orden; this.horaEstimada = horaEstimada;
        }
        public String getNombre() { return nombre; }
        public Integer getOrden() { return orden; }
        public String getHoraEstimada() { return horaEstimada; }
    }

    private java.util.List<Escala> itinerario;
    public java.util.List<Escala> getItinerario() { return itinerario; }
    public void setItinerario(java.util.List<Escala> itinerario) { this.itinerario = itinerario; }


    private String id;
    private String codigoViaje;
    private String rutaNombre;
    private String embarcacionNombre;

    private String origen;
    private String destino;
    private Integer ordenOrigen;
    private Integer ordenDestino;

    private String fechaSalida;
    private String horaSalida;
    private String duracionAproximada;

    private BigDecimal precioNormal;
    private BigDecimal precioVip;

    private int asientosLibres;

    private String vipPosicion;   // PROA | POPA — orden de las secciones del bote
    private String capitan;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCodigoViaje() { return codigoViaje; }
    public void setCodigoViaje(String codigoViaje) { this.codigoViaje = codigoViaje; }

    public String getRutaNombre() { return rutaNombre; }
    public void setRutaNombre(String rutaNombre) { this.rutaNombre = rutaNombre; }

    public String getEmbarcacionNombre() { return embarcacionNombre; }
    public void setEmbarcacionNombre(String embarcacionNombre) { this.embarcacionNombre = embarcacionNombre; }

    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }

    public String getDestino() { return destino; }
    public void setDestino(String destino) { this.destino = destino; }

    public Integer getOrdenOrigen() { return ordenOrigen; }
    public void setOrdenOrigen(Integer ordenOrigen) { this.ordenOrigen = ordenOrigen; }

    public Integer getOrdenDestino() { return ordenDestino; }
    public void setOrdenDestino(Integer ordenDestino) { this.ordenDestino = ordenDestino; }

    public String getFechaSalida() { return fechaSalida; }
    public void setFechaSalida(String fechaSalida) { this.fechaSalida = fechaSalida; }

    public String getHoraSalida() { return horaSalida; }
    public void setHoraSalida(String horaSalida) { this.horaSalida = horaSalida; }

    public String getDuracionAproximada() { return duracionAproximada; }
    public void setDuracionAproximada(String duracionAproximada) { this.duracionAproximada = duracionAproximada; }

    public BigDecimal getPrecioNormal() { return precioNormal; }
    public void setPrecioNormal(BigDecimal precioNormal) { this.precioNormal = precioNormal; }

    public BigDecimal getPrecioVip() { return precioVip; }
    public void setPrecioVip(BigDecimal precioVip) { this.precioVip = precioVip; }

    public int getAsientosLibres() { return asientosLibres; }
    public void setAsientosLibres(int asientosLibres) { this.asientosLibres = asientosLibres; }

    public String getVipPosicion() { return vipPosicion; }
    public void setVipPosicion(String vipPosicion) { this.vipPosicion = vipPosicion; }

    public String getCapitan() { return capitan; }
    public void setCapitan(String capitan) { this.capitan = capitan; }
}
