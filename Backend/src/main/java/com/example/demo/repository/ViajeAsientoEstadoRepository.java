package com.example.demo.repository;

import com.example.demo.model.ViajeAsientoEstado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ViajeAsientoEstadoRepository extends JpaRepository<ViajeAsientoEstado, String> {

    List<ViajeAsientoEstado> findByViajeIdOrderByNumeroAsc(String viajeId);

    Optional<ViajeAsientoEstado> findByViajeIdAndNumero(String viajeId, Integer numero);

    /**
     * Asientos libres para un tramo. Manda el solapamiento de tramos, no el estado
     * del asiento: un asiento vendido de Requena a Herrera queda disponible de
     * Herrera en adelante, porque el pasajero ya bajó. Una venta directa hasta el
     * final ocupa todos los tramos y por lo tanto bloquea el asiento entero.
     */
    @Query("""
        SELECT a FROM ViajeAsientoEstado a
        WHERE a.viajeId = :viajeId
        AND NOT EXISTS (
            SELECT t FROM ViajeAsientoTramoOcupado t
            WHERE t.viajeAsientoEstado = a
            AND CAST(t.tramo AS integer) >= :ordenOrigen
            AND CAST(t.tramo AS integer) < :ordenDestino
        )
        ORDER BY a.numero ASC
    """)
    List<ViajeAsientoEstado> findAsientosLibresPorTramo(
            @Param("viajeId") String viajeId,
            @Param("ordenOrigen") int ordenOrigen,
            @Param("ordenDestino") int ordenDestino
    );

    Optional<ViajeAsientoEstado> findByVentaId(String ventaId);

    void deleteByViajeId(String viajeId);
}