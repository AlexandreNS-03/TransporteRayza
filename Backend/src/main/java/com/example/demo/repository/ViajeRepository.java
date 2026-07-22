package com.example.demo.repository;

import com.example.demo.model.Viaje;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ViajeRepository extends JpaRepository<Viaje, String> {

    List<Viaje> findAllByOrderByFechaSalidaDesc();

    List<Viaje> findByFechaSalidaBetween(LocalDate inicio, LocalDate fin);

    /** Viajes en alguno de los estados dados y que ya deberían haber salido. */
    List<Viaje> findByEstadoInAndFechaSalidaLessThanEqual(
            List<Viaje.EstadoViaje> estados, LocalDate hasta);
}