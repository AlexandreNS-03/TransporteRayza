package com.example.demo.service;

/**
 * Las reglas de una contraseña, en un solo lugar.
 *
 * <p>Existe por un error concreto: la regla estaba copiada en tres sitios y los
 * tres decían cosas distintas. El cliente necesitaba ocho caracteres; el
 * personal, seis para cambiarla y <strong>ninguno para crearla</strong> — se
 * podía dar de alta un administrador con la clave "1". Justo al revés de como
 * debería: las cuentas del personal son las que ven a todos los pasajeros, la
 * caja y el respaldo de la base.
 *
 * <p>No es que alguien lo decidiera así: la regla se copió y después cada copia
 * siguió su camino. Por eso ahora hay una sola, y quien quiera cambiarla la
 * cambia acá para todos.
 */
public final class Claves {

    private Claves() { }

    /** Lo mínimo, para cualquier cuenta. */
    public static final int MINIMO = 8;

    /**
     * Las que aparecen primero en cualquier intento por fuerza bruta.
     *
     * <p>No pretende ser un diccionario: un diccionario de verdad es un
     * archivo de millones y no cabe acá. Son las cuatro que alguien prueba
     * antes de molestarse en escribir un programa.
     */
    private static final String[] OBVIAS = {
        "12345678", "contrasena", "password", "rayza123",
    };

    /** Valida una contraseña cualquiera. Explota con el motivo si no sirve. */
    public static void validar(String clave) {
        if (clave == null || clave.length() < MINIMO)
            throw new RuntimeException("La contraseña debe tener al menos " + MINIMO + " caracteres");

        String s = clave.toLowerCase();
        for (String obvia : OBVIAS)
            if (s.equals(obvia))
                throw new RuntimeException(
                        "Esa contraseña es de las primeras que alguien probaría. Elige otra.");
    }

    /**
     * Lo mismo, más la comprobación de que no sea el propio nombre de usuario.
     *
     * <p>Una cuenta "caja01" con la clave "caja01" no la rompe nadie: la
     * adivina. Y es exactamente lo que sale cuando hay que crear seis cuentas
     * en una tarde.
     */
    public static void validar(String clave, String usuario) {
        validar(clave);
        if (usuario != null && !usuario.isBlank()
                && clave.equalsIgnoreCase(usuario.trim()))
            throw new RuntimeException("La contraseña no puede ser igual al nombre de usuario");
    }
}
