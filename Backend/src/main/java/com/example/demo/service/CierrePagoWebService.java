package com.example.demo.service;

import com.example.demo.model.Venta;
import com.example.demo.repository.VentaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Cierra el pago de una compra en línea: marca las ventas como pagadas y confirma
 * sus asientos.
 *
 * Vive en su propia clase, y no como un método más de ReservaService, porque hace
 * falta que corra en una transacción que TERMINE antes de emitir el comprobante.
 * Spring solo aplica @Transactional cuando la llamada entra por el proxy del bean:
 * un método privado o protegido invocado desde la misma clase se ejecutaría dentro
 * de la transacción de quien lo llama, que es justo lo que hay que evitar.
 *
 * El motivo: insertar en `comprobantes` necesita un candado sobre la fila de la
 * venta (clave foránea fk_comprobante_venta). Si esa fila la tiene tomada la misma
 * transacción que está pagando, la emisión se queda esperando a que termine algo
 * que a su vez la espera a ella, y muere por "lock wait timeout". Cuando eso pasa
 * el documento ya se envió a SUNAT pero no queda registrado en el sistema.
 */
@Service
public class CierrePagoWebService {

    private final VentaRepository ventaRepository;
    private final AsientoService asientoService;

    public CierrePagoWebService(VentaRepository ventaRepository, AsientoService asientoService) {
        this.ventaRepository = ventaRepository;
        this.asientoService = asientoService;
    }

    /** Deja las ventas pagadas y sus asientos confirmados, y cierra la transacción. */
    @Transactional
    public void marcarPagadas(List<Venta> pendientes, String referencia, String metodo) {
        for (Venta v : pendientes) {
            v.setEstado(Venta.EstadoVenta.PAGADO);
            v.setPasarelaReferencia(referencia);
            if (metodo != null) v.setMetodoPago(metodo);
            v.setReservaExpira(null);
            ventaRepository.save(v);
            asientoService.confirmarAsiento(v.getId());
        }
    }
}
