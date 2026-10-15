package com.example.demo.dto;

import java.math.BigDecimal;

/**
 * Un movimiento del saldo, para la lista de la cuenta.
 *
 * <p>El monto va con su signo tal cual está guardado: positivo lo que entró,
 * negativo lo que se gastó. Así la suma de la lista es exactamente el saldo que
 * se muestra arriba, y si alguna vez no cuadra se ve en qué fila.
 */
public class MovimientoWalletDTO {

    private String id;
    /** SALDO_FAVOR, ABONO, CONSUMO o AJUSTE. */
    private String tipo;
    private BigDecimal monto;
    private String motivo;
    /** ISO-8601. */
    private String fecha;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    public String getFecha() { return fecha; }
    public void setFecha(String fecha) { this.fecha = fecha; }
}
