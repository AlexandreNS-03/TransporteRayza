package com.example.demo.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * La billetera como la ve el cliente en su cuenta.
 *
 * <p>Lleva {@code habilitada} porque la pantalla no tiene que adivinar si la
 * wallet está prendida: mientras esté apagada muestra que todavía no se puede
 * en vez de ofrecer un botón de recargar que falla.
 *
 * <p>No hay "monto por vencer" ni "retiro disponible", y es a propósito: esta
 * plata no vence y no se devuelve en efectivo, solo se gasta en pasajes. Lo dice
 * {@code condiciones} para que la pantalla no tenga que repetirlo escrito a mano.
 */
public class WalletDTO {

    private boolean habilitada;
    private BigDecimal saldo = BigDecimal.ZERO;
    private BigDecimal recargaMinima;
    private BigDecimal recargaMaxima;

    /** Lo que hay que decirle al cliente antes de que ponga plata. */
    private List<String> condiciones;

    private List<MovimientoWalletDTO> movimientos = List.of();

    public boolean isHabilitada() { return habilitada; }
    public void setHabilitada(boolean v) { this.habilitada = v; }
    public BigDecimal getSaldo() { return saldo; }
    public void setSaldo(BigDecimal saldo) { this.saldo = saldo; }
    public BigDecimal getRecargaMinima() { return recargaMinima; }
    public void setRecargaMinima(BigDecimal v) { this.recargaMinima = v; }
    public BigDecimal getRecargaMaxima() { return recargaMaxima; }
    public void setRecargaMaxima(BigDecimal v) { this.recargaMaxima = v; }
    public List<String> getCondiciones() { return condiciones; }
    public void setCondiciones(List<String> v) { this.condiciones = v; }
    public List<MovimientoWalletDTO> getMovimientos() { return movimientos; }
    public void setMovimientos(List<MovimientoWalletDTO> v) { this.movimientos = v; }
}
