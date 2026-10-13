package com.example.demo.dto;

/**
 * Un documento de viaje, como lo ve y lo manda el cliente.
 *
 * El número viaja entero porque es suyo y lo tiene que poder revisar; lo que no
 * sale de acá es el documento de ningún otro.
 */
public class DocumentoViajeDTO {

    private String id;
    /** DNI | CE | PASAPORTE | CPF */
    private String tipo;
    private String paisEmision;
    private String numero;
    /** yyyy-MM-dd, o null si ese documento no vence. */
    private String fechaExpiracion;
    /** Calculados por el servidor: la pantalla no debería hacer cuentas de fechas. */
    private boolean vencido;
    private boolean vencePronto;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public String getPaisEmision() { return paisEmision; }
    public void setPaisEmision(String paisEmision) { this.paisEmision = paisEmision; }
    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }
    public String getFechaExpiracion() { return fechaExpiracion; }
    public void setFechaExpiracion(String fechaExpiracion) { this.fechaExpiracion = fechaExpiracion; }
    public boolean isVencido() { return vencido; }
    public void setVencido(boolean vencido) { this.vencido = vencido; }
    public boolean isVencePronto() { return vencePronto; }
    public void setVencePronto(boolean v) { this.vencePronto = v; }
}
