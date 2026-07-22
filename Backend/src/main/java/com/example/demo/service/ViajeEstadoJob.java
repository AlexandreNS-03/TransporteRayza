package com.example.demo.service;

import com.example.demo.model.Viaje;
import com.example.demo.repository.ViajeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Hace avanzar solo el estado de los viajes según su hora de salida, para que el
 * listado refleje la realidad sin que nadie tenga que tocarlos a mano:
 *
 *   PROGRAMADO → EN_CURSO     al cerrarse la ventana de embarque (salida + 20 min)
 *   EN_CURSO   → COMPLETADO   pasadas las horas estimadas de recorrido
 *
 * El paso a EN_CURSO espera a que cierre el embarque a propósito: la venta en
 * mostrador admite pasajeros hasta 20 minutos después de la salida, y adelantarlo
 * dejaría al personal sin poder registrar a los que llegan sobre la hora.
 *
 * Nunca toca los viajes CANCELADOS. Corre cada 5 minutos; si el servidor estuvo
 * apagado, al arrancar pone al día todo lo atrasado.
 */
@Component
public class ViajeEstadoJob {

    private final ViajeRepository viajeRepository;

    /** Minutos tras la salida en que el viaje pasa a EN_CURSO (cierre del embarque). */
    @Value("${app.viajes.minutos-para-en-curso:20}")
    private int minutosParaEnCurso;

    /** Horas tras la salida en que el viaje se da por COMPLETADO. */
    @Value("${app.viajes.horas-para-completado:12}")
    private int horasParaCompletado;

    public ViajeEstadoJob(ViajeRepository viajeRepository) {
        this.viajeRepository = viajeRepository;
    }

    @Scheduled(fixedDelay = 300_000)
    @Transactional
    public void actualizarEstados() {
        LocalDateTime ahora = LocalDateTime.now();

        // Se piden por fecha (hoy o antes) para no recorrer los viajes futuros
        List<Viaje> candidatos = viajeRepository.findByEstadoInAndFechaSalidaLessThanEqual(
                List.of(Viaje.EstadoViaje.PROGRAMADO, Viaje.EstadoViaje.EN_CURSO),
                LocalDate.now());

        int enCurso = 0, completados = 0;

        for (Viaje v : candidatos) {
            LocalDateTime salida = salidaDe(v);
            if (salida == null) continue;

            if (ahora.isAfter(salida.plusHours(horasParaCompletado))) {
                v.setEstado(Viaje.EstadoViaje.COMPLETADO);
                viajeRepository.save(v);
                completados++;
            } else if (v.getEstado() == Viaje.EstadoViaje.PROGRAMADO
                    && ahora.isAfter(salida.plusMinutes(minutosParaEnCurso))) {
                v.setEstado(Viaje.EstadoViaje.EN_CURSO);
                viajeRepository.save(v);
                enCurso++;
            }
        }

        if (enCurso > 0 || completados > 0)
            System.out.println("[ViajeEstado] en curso: " + enCurso + " · completados: " + completados);
    }

    private LocalDateTime salidaDe(Viaje v) {
        if (v.getFechaSalida() == null) return null;
        LocalTime hora = v.getHoraSalida() != null ? v.getHoraSalida() : LocalTime.MIDNIGHT;
        return LocalDateTime.of(v.getFechaSalida(), hora);
    }
}
