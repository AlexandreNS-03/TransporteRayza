package com.example.demo.service;

import java.security.SecureRandom;

/**
 * El código de pasajero frecuente: {@code RZ-7K3M9Q}.
 *
 * <p>Sirve para que en el mostrador la persona diga un código corto en vez de
 * deletrear su documento, y para que su cuenta tenga un nombre propio en el
 * sistema.
 *
 * <p><strong>El alfabeto no tiene O, 0, I, 1 ni L.</strong> Esto se dicta en
 * voz alta a través de una ventanilla, muchas veces con el motor de una lancha
 * al lado: un código que se confunde al dictarlo no sirve para lo único que
 * tiene que hacer.
 *
 * <p>No se deriva del documento ni del correo a propósito. Un código derivado
 * del DNI deja de ser un código y pasa a ser el DNI escrito de otra forma: se
 * puede calcular hacia atrás, y entonces mostrarlo en una tarjeta sería mostrar
 * el documento.
 */
public final class CodigoPasajero {

    private CodigoPasajero() { }

    private static final String ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final int LARGO = 6;
    private static final SecureRandom AZAR = new SecureRandom();

    public static String nuevo() {
        StringBuilder sb = new StringBuilder("RZ-");
        for (int i = 0; i < LARGO; i++)
            sb.append(ALFABETO.charAt(AZAR.nextInt(ALFABETO.length())));
        return sb.toString();
    }
}
