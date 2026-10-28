package com.example.demo.dto;

import java.util.List;

/**
 * Lo que la web pública puede anunciar hoy sobre tener cuenta.
 *
 * <p>Existe para que la página <strong>no invente</strong>. La wallet y el
 * programa de pasajero frecuente se prenden y se apagan desde la configuración,
 * y sus números se ajustan: anunciar un beneficio que está apagado, o un
 * descuento que ya cambió, es una promesa que el sistema no cumple y un reclamo
 * en el mostrador.
 *
 * <p>Va sin autenticación porque lo mira quien todavía no tiene cuenta —que es
 * justamente a quien hay que convencer—, y no dice nada de nadie: son las
 * reglas del programa, no los datos de un cliente.
 */
public record BeneficiosDTO(
        boolean wallet,
        boolean fidelidad,
        List<Escalon> escalones,
        int meses) {

    /** Un nivel del programa: cuántos viajes pide y cuánto descuenta. */
    public record Escalon(String nombre, int viajes, int descuento) {}
}
