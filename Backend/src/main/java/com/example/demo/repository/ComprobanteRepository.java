package com.example.demo.repository;

import com.example.demo.model.Comprobante;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ComprobanteRepository extends JpaRepository<Comprobante, String> {

    List<Comprobante> findAllByOrderByCreatedAtDesc();

    /**
     * Los comprobantes emitidos en un rango de fechas.
     *
     * La pantalla traía todo el historial en cada carga. Con el filtro en la
     * consulta, la base devuelve solo lo que se va a mostrar.
     */
    List<Comprobante> findByFechaDeEmisionBetweenOrderByCreatedAtDesc(
            java.time.LocalDate desde, java.time.LocalDate hasta);

    List<Comprobante> findByVentaId(String ventaId);

    // Correlativo por tipo+serie: en modo demo de Nubefact las notas de crédito
    // comparten serie con boletas/facturas pero llevan numeración propia
    Optional<Comprobante> findTopByTipoDeComprobanteAndSerieOrderByNumeroDesc(
            Comprobante.TipoComprobante tipo, String serie);

    // Comprobante vigente de una venta (las notas de crédito no cuentan como comprobante de venta)
    boolean existsByVentaIdAndEstadoAndTipoDeComprobanteNot(String ventaId,
                                                            Comprobante.EstadoComprobante estado,
                                                            Comprobante.TipoComprobante tipo);

    // Comprobante vigente de una venta en grupo (varios pasajes en un solo documento)
    boolean existsByGrupoVentaIdAndEstadoAndTipoDeComprobanteNot(String grupoVentaId,
                                                                 Comprobante.EstadoComprobante estado,
                                                                 Comprobante.TipoComprobante tipo);

    List<Comprobante> findByGrupoVentaId(String grupoVentaId);

    /** Comprobantes que no quedaron aceptados, para el verificador del sistema. */
    long countByEstadoNot(Comprobante.EstadoComprobante estado);

    boolean existsByEncomiendaIdAndEstadoAndTipoDeComprobanteNot(String encomiendaId,
                                                                 Comprobante.EstadoComprobante estado,
                                                                 Comprobante.TipoComprobante tipo);
}
