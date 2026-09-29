package com.example.demo.repository;

import com.example.demo.model.AutorizacionYape;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AutorizacionYapeRepository extends JpaRepository<AutorizacionYape, String> {

    /** La autorización viva de un cliente, que es contra la que se cobra. */
    Optional<AutorizacionYape> findFirstByClienteEmailAndEstadoOrderByAutorizadoAtDesc(
            String clienteEmail, AutorizacionYape.Estado estado);

    List<AutorizacionYape> findByClienteEmailOrderByCreatedAtDesc(String clienteEmail);
}
