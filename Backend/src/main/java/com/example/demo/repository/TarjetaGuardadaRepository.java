package com.example.demo.repository;

import com.example.demo.model.TarjetaGuardada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TarjetaGuardadaRepository extends JpaRepository<TarjetaGuardada, String> {

    List<TarjetaGuardada> findByClienteEmailAndEstadoOrderByPreferidaDescUsadaAtDesc(
            String clienteEmail, TarjetaGuardada.Estado estado);

    Optional<TarjetaGuardada> findByIdAndClienteEmail(String id, String clienteEmail);

    /** Para no guardar dos veces la misma tarjeta si el cliente vuelve a pagar con ella. */
    Optional<TarjetaGuardada> findByClienteEmailAndToken(String clienteEmail, String token);

    long countByClienteEmailAndEstado(String clienteEmail, TarjetaGuardada.Estado estado);
}
