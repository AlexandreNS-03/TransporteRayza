package com.example.demo.repository;

import com.example.demo.model.TokenRecuperacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface TokenRecuperacionRepository extends JpaRepository<TokenRecuperacion, String> {

    Optional<TokenRecuperacion> findByTokenHash(String tokenHash);

    /**
     * Invalida los enlaces anteriores de la misma cuenta.
     *
     * Pedir uno nuevo tiene que apagar el viejo: si no, un correo reenviado hace
     * meses seguiría sirviendo para entrar.
     */
    @Modifying
    @Query("UPDATE TokenRecuperacion t SET t.usadoAt = :ahora "
         + "WHERE t.cuentaId = :cuentaId AND t.usadoAt IS NULL")
    void invalidarAnteriores(String cuentaId, LocalDateTime ahora);
}
