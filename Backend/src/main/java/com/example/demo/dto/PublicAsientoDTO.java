package com.example.demo.dto;

/**
 * Asiento visto por el cliente: número, tipo y si está libre para el tramo elegido.
 * Devuelve TODOS los asientos (no solo los libres) para poder dibujar el mapa
 * completo mostrando los ocupados en gris, igual que el sistema de ventas.
 */
public class PublicAsientoDTO {

    private Integer numero;
    private String tipo;    // NORMAL | VIP
    private boolean libre;

    public PublicAsientoDTO() {}
    public PublicAsientoDTO(Integer numero, String tipo, boolean libre) {
        this.numero = numero;
        this.tipo = tipo;
        this.libre = libre;
    }

    public Integer getNumero() { return numero; }
    public void setNumero(Integer numero) { this.numero = numero; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public boolean isLibre() { return libre; }
    public void setLibre(boolean libre) { this.libre = libre; }
}
