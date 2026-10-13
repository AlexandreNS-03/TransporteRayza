package com.example.demo.dto;

import java.math.BigDecimal;

/**
 * Un comprobante como lo ve su dueño desde la cuenta.
 *
 * Es deliberadamente más chico que el ComprobanteDTO del panel: el cliente
 * necesita reconocer cuál es, cuánto fue y poder abrirlo. Los datos internos
 * —la respuesta cruda de Nubefact, el motivo de anulación, el usuario que lo
 * emitió— no tienen por qué salir de la empresa.
 */
public class ClienteComprobanteDTO {

    /** "Boleta" o "Factura", ya escrito como se lee. */
    private String tipo;
    /** "B001-00000032", el número con el que lo reclama si hace falta. */
    private String numero;
    private String fechaDeEmision;
    private BigDecimal total;
    /** El viaje que pagó, para reconocerlo en la lista. */
    private String concepto;
    private String estado;
    /** El PDF en Nubefact. Puede faltar si el comprobante aún no fue aceptado. */
    private String enlacePdf;

    public ClienteComprobanteDTO() {}

    public ClienteComprobanteDTO(String tipo, String numero, String fechaDeEmision,
                                 BigDecimal total, String concepto, String estado, String enlacePdf) {
        this.tipo = tipo; this.numero = numero; this.fechaDeEmision = fechaDeEmision;
        this.total = total; this.concepto = concepto; this.estado = estado; this.enlacePdf = enlacePdf;
    }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }
    public String getFechaDeEmision() { return fechaDeEmision; }
    public void setFechaDeEmision(String fechaDeEmision) { this.fechaDeEmision = fechaDeEmision; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public String getConcepto() { return concepto; }
    public void setConcepto(String concepto) { this.concepto = concepto; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getEnlacePdf() { return enlacePdf; }
    public void setEnlacePdf(String enlacePdf) { this.enlacePdf = enlacePdf; }
}
