package com.example.demo.dto;

import java.util.List;

public class AsientoDTO {

    private String id;
    private Integer numero;
    private String tipo;
    private String estado;
    private String pasajeroNombre;
    private String pasajeroDoc;
    private List<String> tramosOcupados;
    private List<OcupacionDTO> ocupaciones;

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Integer getNumero() { return numero; }
    public void setNumero(Integer numero) { this.numero = numero; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getPasajeroNombre() { return pasajeroNombre; }
    public void setPasajeroNombre(String pasajeroNombre) { this.pasajeroNombre = pasajeroNombre; }

    public String getPasajeroDoc() { return pasajeroDoc; }
    public void setPasajeroDoc(String pasajeroDoc) { this.pasajeroDoc = pasajeroDoc; }

    public List<String> getTramosOcupados() { return tramosOcupados; }
    public void setTramosOcupados(List<String> tramosOcupados) { this.tramosOcupados = tramosOcupados; }

    public List<OcupacionDTO> getOcupaciones() { return ocupaciones; }
    public void setOcupaciones(List<OcupacionDTO> ocupaciones) { this.ocupaciones = ocupaciones; }

    /**
     * Un asiento puede llevar a varios pasajeros en tramos distintos, así que los
     * campos pasajeroNombre/pasajeroDoc de arriba muestran solo a uno de ellos.
     * La lista completa —quién viaja y entre qué paradas— va acá.
     */
    public static class OcupacionDTO {
        private String ventaId;
        private String pasajeroNombre;
        private String paradaOrigen;
        private String paradaDestino;
        private Integer ordenOrigen;
        private Integer ordenDestino;
        private String estado;          // PAGADO | RESERVADO

        public String getVentaId() { return ventaId; }
        public void setVentaId(String ventaId) { this.ventaId = ventaId; }

        public String getPasajeroNombre() { return pasajeroNombre; }
        public void setPasajeroNombre(String p) { this.pasajeroNombre = p; }

        public String getParadaOrigen() { return paradaOrigen; }
        public void setParadaOrigen(String p) { this.paradaOrigen = p; }

        public String getParadaDestino() { return paradaDestino; }
        public void setParadaDestino(String p) { this.paradaDestino = p; }

        public Integer getOrdenOrigen() { return ordenOrigen; }
        public void setOrdenOrigen(Integer o) { this.ordenOrigen = o; }

        public Integer getOrdenDestino() { return ordenDestino; }
        public void setOrdenDestino(Integer o) { this.ordenDestino = o; }

        public String getEstado() { return estado; }
        public void setEstado(String estado) { this.estado = estado; }
    }
}