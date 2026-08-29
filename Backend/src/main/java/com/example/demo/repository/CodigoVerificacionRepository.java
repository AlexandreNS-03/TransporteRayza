package com.example.demo.repository;

import com.example.demo.model.CodigoVerificacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface CodigoVerificacionRepository extends JpaRepository<CodigoVerificacion, String> {

    /** Al pedir un código nuevo, los anteriores dejan de servir. */
    @Modifying
    @Query("UPDATE CodigoVerificacion c SET c.usadoAt = :ahora "
         + "WHERE c.usuarioId = :usuarioId AND c.usadoAt IS NULL")
    void invalidarAnteriores(String usuarioId, LocalDateTime ahora);
}
