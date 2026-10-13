package com.example.demo.repository;

import com.example.demo.model.VerificacionEmail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface VerificacionEmailRepository extends JpaRepository<VerificacionEmail, String> {

    Optional<VerificacionEmail> findByTokenHash(String tokenHash);

    /** Pedir uno nuevo apaga los anteriores: el viejo no puede seguir sirviendo. */
    @Modifying
    @Query("UPDATE VerificacionEmail v SET v.usadoAt = :ahora "
         + "WHERE v.clienteId = :clienteId AND v.usadoAt IS NULL")
    void invalidarAnteriores(String clienteId, LocalDateTime ahora);

    /** ¿Ya se le mandó uno hace poco? Para no servir de máquina de spam. */
    @Query("SELECT COUNT(v) > 0 FROM VerificacionEmail v "
         + "WHERE v.clienteId = :clienteId AND v.createdAt > :desde")
    boolean pedidoReciente(String clienteId, LocalDateTime desde);
}
