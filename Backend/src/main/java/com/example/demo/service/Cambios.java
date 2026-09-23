package com.example.demo.service;

import java.util.ArrayList;
import java.util.List;

/**
 * El "antes y después" de una edición, en palabras.
 *
 * Saber que alguien editó un viaje no sirve de nada si no dice QUÉ cambió: fue
 * justamente lo que pasó cuando movieron un horario y nadie pudo reconstruir
 * qué se había tocado. Esto arma "Hora de salida: 08:00 → 11:30" y deja fuera
 * lo que quedó igual, para que el registro se lea de un vistazo.
 *
 * Uso:
 *   String detalle = Cambios.nuevos()
 *       .campo("Hora de salida", antesHora, ahoraHora)
 *       .campo("Embarcación",    antesNave, ahoraNave)
 *       .texto();
 */
public class Cambios {

    private final List<String> partes = new ArrayList<>();

    public static Cambios nuevos() { return new Cambios(); }

    /** Agrega el campo solo si de verdad cambió. */
    public Cambios campo(String nombre, Object antes, Object despues) {
        String a = texto(antes), d = texto(despues);
        if (a.equals(d)) return this;
        partes.add(nombre + ": " + (a.isBlank() ? "(vacío)" : a) + " → " + (d.isBlank() ? "(vacío)" : d));
        return this;
    }

    public boolean hayCambios() { return !partes.isEmpty(); }

    /** Todo junto, o "sin cambios" cuando la edición no tocó nada. */
    public String texto() {
        return partes.isEmpty() ? "sin cambios" : String.join(" · ", partes);
    }

    private static String texto(Object v) {
        return v == null ? "" : v.toString().trim();
    }
}
