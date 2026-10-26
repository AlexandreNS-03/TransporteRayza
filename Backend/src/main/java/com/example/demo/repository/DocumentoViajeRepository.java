package com.example.demo.repository;

import com.example.demo.model.DocumentoViaje;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentoViajeRepository extends JpaRepository<DocumentoViaje, String> {

    List<DocumentoViaje> findByClienteIdOrderByTipoAsc(String clienteId);

    Optional<DocumentoViaje> findByIdAndClienteId(String id, String clienteId);

    Optional<DocumentoViaje> findByClienteIdAndTipoAndNumero(
            String clienteId, DocumentoViaje.Tipo tipo, String numero);

    long countByClienteId(String clienteId);
}
