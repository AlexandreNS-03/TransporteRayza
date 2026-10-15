package com.example.demo.repository;

import com.example.demo.model.Cliente;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ClienteRepository extends JpaRepository<Cliente, String> {
    Optional<Cliente> findByEmail(String email);
    boolean existsByEmail(String email);

    /**
     * El mismo cliente, pero tomando su fila hasta que termine la transacción.
     *
     * Lo usa la wallet para gastar saldo. Sin esto, dos compras a la vez leen
     * los mismos S/ 50 y las dos creen que alcanza: el saldo termina negativo,
     * o sea un pasaje regalado. Se bloquea la fila del cliente —y no sus
     * movimientos— porque el cliente siempre existe, y quien recién estrena la
     * wallet no tiene ningún movimiento que bloquear.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Cliente c WHERE c.email = :email")
    Optional<Cliente> bloquearPorEmail(@Param("email") String email);
}
