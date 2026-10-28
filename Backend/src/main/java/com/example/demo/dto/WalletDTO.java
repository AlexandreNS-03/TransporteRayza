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

    /**
     * Con Mercado Pago en modo de prueba, el código real de la app de Yape no
     * sirve: hay que usar los celulares de prueba. La pantalla lo tiene que
     * decir ANTES de que alguien genere un código que va a vencer sin usarse,
     * así que viaja en el resumen y no en la respuesta del primer intento.
     */
    private boolean yapeDePrueba;

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

    public boolean isYapeDePrueba() { return yapeDePrueba; }
    public void setYapeDePrueba(boolean v) { this.yapeDePrueba = v; }
}
