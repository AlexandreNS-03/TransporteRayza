package com.example.demo.dto;

/**
 * Hoja del Libro de Reclamaciones, de ida y de vuelta.
 *
 * Se usa tanto para lo que envía el consumidor como para la copia que se le
 * devuelve: por eso trae el número correlativo, el estado y la fecha límite de
 * respuesta, que el consumidor no manda pero sí necesita ver.
 */
public class ReclamacionDTO {

    private String id;
    private Integer numero;
    private String createdAt;
    private String tipo;
    private String consumidorNombre;
    private String consumidorTipoDocumento;
    private String consumidorDocumento;
    private String consumidorDomicilio;
    private String consumidorEmail;
    private String consumidorTelefono;
    private Boolean menorDeEdad;
    private String apoderadoNombre;
    private String apoderadoDocumento;
    private String bienTipo;
    private String bienDescripcion;
    private java.math.BigDecimal montoReclamado;
    private String detalle;
    private String pedido;
    private String estado;
    private String respuesta;
    private String respondidoAt;
    private String limiteRespuesta;
    private java.util.List<AdjuntoDTO> adjuntos;

    /** Foto o documento que subió el consumidor. Solo viaja la URL. */
    public static class AdjuntoDTO {
        private String url;
        private String nombre;

        public AdjuntoDTO() { }
        public AdjuntoDTO(String url, String nombre) { this.url = url; this.nombre = nombre; }

        public String getUrl() { return url; }
        public void setUrl(String v) { this.url = v; }
        public String getNombre() { return nombre; }
        public void setNombre(String v) { this.nombre = v; }
    }

    public String getId() { return id; }
    public void setId(String v) { this.id = v; }

    public Integer getNumero() { return numero; }
    public void setNumero(Integer v) { this.numero = v; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String v) { this.createdAt = v; }

    public String getTipo() { return tipo; }
    public void setTipo(String v) { this.tipo = v; }

    public String getConsumidorNombre() { return consumidorNombre; }
    public void setConsumidorNombre(String v) { this.consumidorNombre = v; }

    public String getConsumidorTipoDocumento() { return consumidorTipoDocumento; }
    public void setConsumidorTipoDocumento(String v) { this.consumidorTipoDocumento = v; }

    public String getConsumidorDocumento() { return consumidorDocumento; }
    public void setConsumidorDocumento(String v) { this.consumidorDocumento = v; }

    public String getConsumidorDomicilio() { return consumidorDomicilio; }
    public void setConsumidorDomicilio(String v) { this.consumidorDomicilio = v; }

    public String getConsumidorEmail() { return consumidorEmail; }
    public void setConsumidorEmail(String v) { this.consumidorEmail = v; }

    public String getConsumidorTelefono() { return consumidorTelefono; }
    public void setConsumidorTelefono(String v) { this.consumidorTelefono = v; }

    public Boolean getMenorDeEdad() { return menorDeEdad; }
    public void setMenorDeEdad(Boolean v) { this.menorDeEdad = v; }

    public String getApoderadoNombre() { return apoderadoNombre; }
    public void setApoderadoNombre(String v) { this.apoderadoNombre = v; }

    public String getApoderadoDocumento() { return apoderadoDocumento; }
    public void setApoderadoDocumento(String v) { this.apoderadoDocumento = v; }

    public String getBienTipo() { return bienTipo; }
    public void setBienTipo(String v) { this.bienTipo = v; }

    public String getBienDescripcion() { return bienDescripcion; }
    public void setBienDescripcion(String v) { this.bienDescripcion = v; }

    public java.math.BigDecimal getMontoReclamado() { return montoReclamado; }
    public void setMontoReclamado(java.math.BigDecimal v) { this.montoReclamado = v; }

    public String getDetalle() { return detalle; }
    public void setDetalle(String v) { this.detalle = v; }

    public String getPedido() { return pedido; }
    public void setPedido(String v) { this.pedido = v; }

    public String getEstado() { return estado; }
    public void setEstado(String v) { this.estado = v; }

    public String getRespuesta() { return respuesta; }
    public void setRespuesta(String v) { this.respuesta = v; }

    public String getRespondidoAt() { return respondidoAt; }
    public void setRespondidoAt(String v) { this.respondidoAt = v; }

    public java.util.List<AdjuntoDTO> getAdjuntos() { return adjuntos; }
    public void setAdjuntos(java.util.List<AdjuntoDTO> v) { this.adjuntos = v; }

    public String getLimiteRespuesta() { return limiteRespuesta; }
    public void setLimiteRespuesta(String v) { this.limiteRespuesta = v; }
}
