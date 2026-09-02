package com.example.demo.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Cierra el registro de un sorteo a la hora anunciada.
 *
 * Las bases publican a qué hora deja de aceptarse códigos, y cumplir eso no
 * puede depender de que alguien esté frente al sistema: si el mostrador está
 * ocupado, se seguirían registrando cupones después de la hora prometida.
 *
 * Solo cierra el registro. El sorteo en sí lo sigue ejecutando una persona, en
 * vivo y con el público mirando: es un evento, no un proceso.
 */
@Component
public class SorteoCierreJob {

    private final SorteoService sorteoService;

    public SorteoCierreJob(SorteoService sorteoService) {
        this.sorteoService = sorteoService;
    }

    /**
     * Cada cinco minutos. No hace falta más fino: entre la hora publicada y el
     * cierre real pueden pasar unos minutos sin que nadie lo note, y revisar
     * cada segundo sería gastar por gusto.
     */
    @Scheduled(fixedDelay = 5 * 60 * 1000, initialDelay = 60 * 1000)
    public void cerrarVencidos() {
        try {
            sorteoService.cerrarLosQueYaVencieron();
        } catch (Exception e) {
            // Un fallo acá no puede tumbar el resto de tareas programadas.
            System.err.println("[Sorteo] no se pudo cerrar automáticamente: " + e.getMessage());
        }
    }
}
