package com.example.demo.service;

import com.example.demo.repository.VentaRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

/**
 * La categoría de pasajero frecuente: cuánto viajó y qué descuento le toca.
 *
 * <p>Se cuenta por los <strong>viajes que hizo</strong>, no por los pasajes que
 * compró. Quien compra para su familia compra ocho pasajes y viaja uno solo:
 * contarle los ocho convertiría el programa en un premio a quien paga, no a
 * quien viaja. Por eso se empata por el documento del pasajero.
 *
 * <p>La ventana son los últimos doce meses y no el año calendario. Con el año
 * calendario, cada 1 de enero todo el mundo vuelve a cero el mismo día: el
 * cliente más fiel pierde su categoría de un día para el otro y además se juntan
 * todos los reclamos en la misma semana.
 *
 * <p>Los números viven en la configuración y no acá. Un programa de fidelidad se
 * ajusta —se empieza generoso y se corrige, o al revés— y eso no puede necesitar
 * un despliegue cada vez.
 */
@Service
public class CategoriaPasajero {

    /** Las categorías, de menor a mayor. */
    public enum Nivel { RAYZA, PLATA, ORO }

    private final VentaRepository ventas;

    @Value("${fidelidad.enabled:false}")
    private boolean habilitada;

    @Value("${fidelidad.plata.viajes:6}")
    private int viajesPlata;

    @Value("${fidelidad.plata.descuento:5}")
    private int descuentoPlata;

    @Value("${fidelidad.oro.viajes:18}")
    private int viajesOro;

    @Value("${fidelidad.oro.descuento:10}")
    private int descuentoOro;

    @Value("${fidelidad.meses:12}")
    private int meses;

    public CategoriaPasajero(VentaRepository ventas) {
        this.ventas = ventas;
    }

    public boolean estaHabilitada() { return habilitada; }

    /** Lo que se sabe de un pasajero: su categoría, sus viajes y qué le falta. */
    public record Estado(Nivel nivel, int viajes, int descuento,
                         Nivel siguiente, int viajesParaSiguiente) {

        /** ¿Este pasajero paga menos? */
        public boolean tieneDescuento() { return descuento > 0; }
    }

    /**
     * La categoría de quien viaja con este documento.
     *
     * <p>Sin documento no hay categoría: es lo único que ata los viajes de una
     * persona entre sí, porque un mismo pasajero puede haber comprado unas veces
     * en la web y otras en la ventanilla.
     */
    public Estado de(String documento) {
        if (!habilitada || documento == null || documento.isBlank())
            return new Estado(Nivel.RAYZA, 0, 0, null, 0);

        int viajes = (int) ventas.contarViajesDe(documento.trim(),
                LocalDate.now().minusMonths(meses));
        return conViajes(viajes);
    }

    /** La misma cuenta, cuando los viajes ya se contaron. */
    public Estado conViajes(int viajes) {
        if (!habilitada) return new Estado(Nivel.RAYZA, 0, 0, null, 0);

        if (viajes >= viajesOro)
            return new Estado(Nivel.ORO, viajes, descuentoOro, null, 0);
        if (viajes >= viajesPlata)
            return new Estado(Nivel.PLATA, viajes, descuentoPlata,
                    Nivel.ORO, viajesOro - viajes);
        return new Estado(Nivel.RAYZA, viajes, 0, Nivel.PLATA, viajesPlata - viajes);
    }

    /**
     * El precio ya con el descuento de la categoría.
     *
     * <p>Redondea a céntimos hacia abajo, a favor del pasajero: el que paga es
     * él, y un céntimo de más en un descuento es una queja que cuesta más
     * atender que el céntimo.
     */
    public BigDecimal conDescuento(BigDecimal precio, Estado estado) {
        if (precio == null || estado == null || !estado.tieneDescuento()) return precio;

        BigDecimal rebaja = precio
                .multiply(BigDecimal.valueOf(estado.descuento()))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.DOWN);
        BigDecimal resultado = precio.subtract(rebaja);
        return resultado.signum() < 0 ? BigDecimal.ZERO : resultado;
    }

    /** Un escalón del programa, como se le cuenta a quien todavía no tiene cuenta. */
    public record Escalon(String nombre, int viajes, int descuento) {}

    /**
     * El programa tal como se publica.
     *
     * <p>Lo pide la web para contarlo en la página de inicio. Sale de acá y no
     * está escrito en la página porque estos números se ajustan desde la
     * configuración: una página que promete "6 viajes" cuando ya son ocho es una
     * promesa que el sistema no va a cumplir, y el que reclama tiene razón.
     *
     * <p>Apagado devuelve la lista vacía, y entonces la web no anuncia nada. Un
     * beneficio anunciado que no existe todavía es peor que no anunciarlo.
     */
    public List<Escalon> escalones() {
        if (!habilitada) return List.of();
        return List.of(
                new Escalon(nombre(Nivel.PLATA), viajesPlata, descuentoPlata),
                new Escalon(nombre(Nivel.ORO), viajesOro, descuentoOro));
    }

    /** Cuántos meses hacia atrás cuentan los viajes. */
    public int mesesDeLaVentana() { return meses; }

    /** Cómo se llama la categoría en pantalla. */
    public static String nombre(Nivel n) {
        if (n == null) return "Rayza";
        return switch (n) {
            case ORO   -> "Oro";
            case PLATA -> "Plata";
            case RAYZA -> "Rayza";
        };
    }
}
