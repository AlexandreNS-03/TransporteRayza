package com.example.demo.repository;

import com.example.demo.model.AcompananteFrecuente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AcompananteFrecuenteRepository extends JpaRepository<AcompananteFrecuente, String> {

    List<AcompananteFrecuente> findByClienteIdOrderByNombreCompletoAsc(String clienteId);

    Optional<AcompananteFrecuente> findByIdAndClienteId(String id, String clienteId);

    Optional<AcompananteFrecuente> findByClienteIdAndTipoDocumentoAndNumeroDocumento(
            String clienteId, String tipoDocumento, String numeroDocumento);

    long countByClienteId(String clienteId);
}
