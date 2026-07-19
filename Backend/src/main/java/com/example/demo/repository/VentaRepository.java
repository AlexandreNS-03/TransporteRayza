package com.example.demo.repository;

import com.example.demo.model.Venta;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface VentaRepository extends JpaRepository<Venta, String> {
    List<Venta> findAllByOrderByFechaVentaDesc();

    Optional<Venta> findTopByOrderByNumeroComprobanteDesc();
    List<Venta> findByViajeId(String viajeId);
    Optional<Venta> findByCodigoQr(String codigoQr);
    List<Venta> findByPasajeroDocumento(String documento);

    @Query("""
        SELECT v.fechaVenta AS dia, COUNT(v) AS ventas, SUM(v.precio) AS ingresos
        FROM Venta v
        WHERE v.fechaVenta >= :desde AND v.estado = 'PAGADO'
        GROUP BY v.fechaVenta
        ORDER BY v.fechaVenta ASC
    """)
    List<VentaPorDiaProjection> contarVentasEIngresosPorDia(@Param("desde") LocalDate desde);

    @Query("""
        SELECT CONCAT(v.paradaOrigen, ' → ', v.paradaDestino) AS ruta, COUNT(v) AS ventas
        FROM Venta v
        WHERE v.fechaVenta >= :desde AND v.estado = 'PAGADO'
        GROUP BY v.paradaOrigen, v.paradaDestino
        ORDER BY COUNT(v) DESC
    """)
    List<TopRutaProjection> obtenerTopRutas(@Param("desde") LocalDate desde, Pageable pageable);

    @Query("""
        SELECT CAST(v.asientoTipo AS string) AS tipo, COUNT(v) AS cantidad
        FROM Venta v
        WHERE v.fechaVenta >= :desde AND v.estado = 'PAGADO'
        GROUP BY v.asientoTipo
    """)
    List<OcupacionTipoProjection> contarOcupacionPorTipo(@Param("desde") LocalDate desde);
}