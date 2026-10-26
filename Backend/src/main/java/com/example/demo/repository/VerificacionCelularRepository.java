package com.example.demo.repository;

import com.example.demo.model.VerificacionCelular;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface VerificacionCelularRepository extends JpaRepository<VerificacionCelular, String> {

    /** El código vigente del cliente, si lo hay. */
    Optional<VerificacionCelular> findFirstByClienteIdAndUsadoAtIsNullOrderByCreatedAtDesc(String clienteId);

    /** Pedir uno nuevo apaga el anterior: dos códigos vivos es uno de más. */
    @Modifying
    @Query("UPDATE VerificacionCelular v SET v.usadoAt = :ahora "
         + "WHERE v.clienteId = :clienteId AND v.usadoAt IS NULL")
    void invalidarAnteriores(String clienteId, LocalDateTime ahora);

    @Query("SELECT COUNT(v) > 0 FROM VerificacionCelular v "
         + "WHERE v.clienteId = :clienteId AND v.createdAt > :desde")
    boolean pedidoReciente(String clienteId, LocalDateTime desde);
}
