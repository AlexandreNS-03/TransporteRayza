package com.example.demo.repository;

import com.example.demo.model.Venta;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
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
    List<Venta> findAllByOrderByCreatedAtDesc();

    /**
     * Las ventas de un rango de fechas.
     *
     * La pantalla de Pasajes traía todas las ventas de la historia en cada
     * carga. Con el filtro en la consulta, la base devuelve solo lo que se va
     * a mostrar en vez de mandarlo todo para que el navegador lo descarte.
     */
    @EntityGraph(attributePaths = "tramosUsados")
    List<Venta> findByFechaVentaBetweenOrderByCreatedAtDesc(LocalDate desde, LocalDate hasta);

    Optional<Venta> findTopByOrderByNumeroComprobanteDesc();
    List<Venta> findByViajeId(String viajeId);
    List<Venta> findByResolucion(Venta.Resolucion resolucion);
    List<Venta> findByOrdenPago(String ordenPago);
    List<Venta> findByGrupoVentaId(String grupoVentaId);
    Optional<Venta> findByCodigoQr(String codigoQr);
    List<Venta> findByPasajeroDocumento(String documento);
    List<Venta> findByClienteEmailIgnoreCaseOrderByCreatedAtDesc(String clienteEmail);

    // ── Compra en línea (Fase 2) ──
    List<Venta> findByClienteIdOrderByCreatedAtDesc(String clienteId);
    List<Venta> findByEstadoAndReservaExpiraBefore(Venta.EstadoVenta estado, java.time.LocalDateTime limite);

    /** Ventas pagadas desde una fecha. Para emitir los códigos de sorteo que falten. */
    List<Venta> findByEstadoAndCreatedAtGreaterThanEqual(Venta.EstadoVenta estado,
                                                         java.time.LocalDateTime desde);

    /** Solo el conteo: el verificador del sistema lo consulta seguido y no necesita las filas. */
    long countByEstadoAndReservaExpiraBefore(Venta.EstadoVenta estado, java.time.LocalDateTime limite);

    /**
     * Cuántas veces viajó esta persona desde una fecha, para su categoría.
     *
     * <p>Se cuenta por el documento del PASAJERO y no por la cuenta que compró:
     * quien compra ocho pasajes para su familia viaja uno solo, y contarle los
     * ocho premiaría a quien paga en vez de a quien viaja. Así además le cuentan
     * los viajes que compró en la ventanilla antes de tener cuenta.
     *
     * <p>Los anulados no cuentan: un pasaje devuelto es un viaje que no se hizo.
     */
    @Query("""
           SELECT COUNT(v) FROM Venta v
            WHERE v.pasajeroDocumento = :documento
              AND v.estado = com.example.demo.model.Venta$EstadoVenta.PAGADO
              AND v.fechaVenta >= :desde
           """)
    long contarViajesDe(@Param("documento") String documento,
                        @Param("desde") java.time.LocalDate desde);

    /** Reservas sin pagar que están por vencer y a las que todavía no se les avisó. */
    List<Venta> findByEstadoAndAvisoPagoEnviadoIsNullAndReservaExpiraBetween(
            Venta.EstadoVenta estado, java.time.LocalDateTime desde, java.time.LocalDateTime hasta);

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