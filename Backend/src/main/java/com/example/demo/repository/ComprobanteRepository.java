package com.example.demo.repository;

import com.example.demo.model.Comprobante;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ComprobanteRepository extends JpaRepository<Comprobante, String> {

    List<Comprobante> findAllByOrderByCreatedAtDesc();

    List<Comprobante> findByVentaId(String ventaId);

    // Correlativo por tipo+serie: en modo demo de Nubefact las notas de crédito
    // comparten serie con boletas/facturas pero llevan numeración propia
    Optional<Comprobante> findTopByTipoDeComprobanteAndSerieOrderByNumeroDesc(
            Comprobante.TipoComprobante tipo, String serie);

    // Comprobante vigente de una venta (las notas de crédito no cuentan como comprobante de venta)
    boolean existsByVentaIdAndEstadoAndTipoDeComprobanteNot(String ventaId,
                                                            Comprobante.EstadoComprobante estado,
                                                            Comprobante.TipoComprobante tipo);

    boolean existsByEncomiendaIdAndEstadoAndTipoDeComprobanteNot(String encomiendaId,
                                                                 Comprobante.EstadoComprobante estado,
                                                                 Comprobante.TipoComprobante tipo);
}
