package com.example.demo.repository;

import com.example.demo.model.Sorteo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SorteoRepository extends JpaRepository<Sorteo, String> {

    List<Sorteo> findAllByOrderByCreatedAtDesc();

    /**
     * El sorteo que está recibiendo cupones.
     *
     * Solo puede haber uno: si hubiera dos abiertos, un pasaje no sabría a cuál
     * pertenece su código y el ticket saldría con un cupón ambiguo.
     */
    Optional<Sorteo> findFirstByEstado(Sorteo.Estado estado);

    /** Los ya realizados, del más reciente al más viejo. */
    List<Sorteo> findByEstadoOrderBySorteadoAtDesc(Sorteo.Estado estado);

    /** Todos los que están en un estado, para el listado y para el cierre automático. */
    List<Sorteo> findByEstado(Sorteo.Estado estado);
}
