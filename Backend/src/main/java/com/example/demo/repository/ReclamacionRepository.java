package com.example.demo.repository;

import com.example.demo.model.Reclamacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReclamacionRepository extends JpaRepository<Reclamacion, String> {

    List<Reclamacion> findAllByOrderByNumeroDesc();

    List<Reclamacion> findByEstadoOrderByCreatedAtAsc(Reclamacion.Estado estado);

    /** El último correlativo usado, para continuar la numeración sin repetir. */
    @Query("SELECT COALESCE(MAX(r.numero), 0) FROM Reclamacion r")
    int ultimoNumero();
}
