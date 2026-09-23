package com.example.demo.repository;

import com.example.demo.model.Auditoria;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditoriaRepository extends JpaRepository<Auditoria, String> {

    List<Auditoria> findTop500ByOrderByCreatedAtDesc();

    /**
     * Lo ocurrido en un rango de fechas.
     *
     * La pantalla se queda con los últimos 500 movimientos, que alcanzan para
     * mirar el día; pero para rastrear algo de la semana pasada —o exportarlo—
     * hay que poder pedir un rango y traerlo entero.
     */
    List<Auditoria> findByCreatedAtBetweenOrderByCreatedAtDesc(
            java.time.LocalDateTime desde, java.time.LocalDateTime hasta);
}
