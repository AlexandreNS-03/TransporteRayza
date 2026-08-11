package com.example.demo.service;

import com.example.demo.model.Comprobante;
import com.example.demo.model.Rol;
import com.example.demo.model.Usuario;
import com.example.demo.model.Venta;
import com.example.demo.model.Viaje;
import com.example.demo.repository.ComprobanteRepository;
import com.example.demo.repository.UsuarioRepository;
import com.example.demo.repository.VentaRepository;
import com.example.demo.repository.ViajeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Ventas que se cobraron pidiendo boleta o factura y todavía no la tienen emitida.
 *
 * El comprobante electrónico se emite en un segundo paso, y en el mostrador es
 * fácil que quede para después y se olvide: el pasajero ya se fue con su ticket y
 * nada en pantalla recuerda que falta. Después aparecen todas juntas al cierre.
 *
 * Lo que se vendió como TICKET no cuenta: ese cliente no pidió comprobante
 * electrónico y listarlo solo haría ruido.
 *
 * Se agrupa por fecha de viaje, que es como el personal ubica su trabajo, y cada
 * oficina ve lo suyo.
 */
@Service
public class ComprobantesPendientesService {

    private final VentaRepository ventaRepository;
    private final ComprobanteRepository comprobanteRepository;
    private final ViajeRepository viajeRepository;
    private final UsuarioRepository usuarioRepository;

    public ComprobantesPendientesService(VentaRepository ventaRepository,
                                         ComprobanteRepository comprobanteRepository,
                                         ViajeRepository viajeRepository,
                                         UsuarioRepository usuarioRepository) {
        this.ventaRepository = ventaRepository;
        this.comprobanteRepository = comprobanteRepository;
        this.viajeRepository = viajeRepository;
        this.usuarioRepository = usuarioRepository;
    }

    /** Una fila de lo que falta emitir. */
    public static class Pendiente {
        public String tipo;              // por ahora solo PASAJE
        public String id;                // venta o encomienda
        public String grupoVentaId;      // si el pasaje se vendió junto a otros
        public String documento;         // BOLETA | FACTURA
        public String cliente;
        public String detalle;           // pasajero y asiento
        public String fechaViaje;        // por dónde se agrupa: la fecha del viaje
        public String viajeCodigo;
        public String sucursal;
        public String vendedor;
        public BigDecimal monto;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> pendientes(String usuarioNombre) {
        Usuario usuario = usuarioNombre == null ? null
                : usuarioRepository.findByUsername(usuarioNombre).orElse(null);

        // Cada oficina ve lo suyo; el ADMIN y quien no tenga sucursal asignada, todo.
        String sucursalId = (usuario != null && usuario.getRol() != Rol.ADMIN)
                ? usuario.getSucursalId() : null;
        Set<String> misViajes = sucursalId == null ? null
                : viajeRepository.findBySucursalId(sucursalId).stream()
                    .map(Viaje::getId).collect(Collectors.toSet());

        List<Pendiente> lista = new ArrayList<>();
        // Un grupo de pasajes se emite en un solo comprobante: se muestra una vez.
        Set<String> gruposVistos = new java.util.HashSet<>();

        for (Venta v : ventaRepository.findAll()) {
            if (v.getEstado() != Venta.EstadoVenta.PAGADO) continue;
            if (!necesitaComprobante(v.getTipoComprobante())) continue;
            if (misViajes != null && (v.getViajeId() == null || !misViajes.contains(v.getViajeId()))) continue;
            if (yaEmitido(v)) continue;
            if (v.getGrupoVentaId() != null && !gruposVistos.add(v.getGrupoVentaId())) continue;

            Pendiente p = new Pendiente();
            p.tipo = "PASAJE";
            p.id = v.getId();
            p.grupoVentaId = v.getGrupoVentaId();
            p.documento = v.getTipoComprobante().name();
            p.cliente = v.getClienteNombre();
            p.detalle = v.getPasajeroNombre()
                    + (v.getAsientoNumero() != null ? " · Asiento #" + v.getAsientoNumero() : "");
            p.viajeCodigo = v.getViajeCodigo();
            p.sucursal = sucursalDe(v.getViajeId());
            p.vendedor = v.getUsuarioNombre();
            p.monto = montoDe(v);
            p.fechaViaje = fechaDe(v.getViajeId(), v.getFechaVenta() != null ? v.getFechaVenta().toString() : null);
            lista.add(p);
        }

        // Las encomiendas quedan fuera a propósito: no guardan qué documento pidió el
        // cliente, así que listarlas todas como pendientes sería puro ruido. Se pueden
        // sumar el día que la encomienda registre si va con boleta, factura o nada.

        // Lo más viejo primero: eso es lo que más urge regularizar.
        lista.sort((a, b) -> safe(a.fechaViaje).compareTo(safe(b.fechaViaje)));

        // Agrupado por fecha de viaje, que es como el personal lo tiene en la cabeza.
        Map<String, List<Pendiente>> porFecha = new LinkedHashMap<>();
        for (Pendiente p : lista) porFecha.computeIfAbsent(safe(p.fechaViaje), k -> new ArrayList<>()).add(p);

        List<Map<String, Object>> resumen = porFecha.entrySet().stream()
                .map(e -> {
                    Map<String, Object> f = new LinkedHashMap<>();
                    f.put("fecha", e.getKey());
                    f.put("cantidad", e.getValue().size());
                    f.put("monto", e.getValue().stream()
                            .map(p -> p.monto == null ? BigDecimal.ZERO : p.monto)
                            .reduce(BigDecimal.ZERO, BigDecimal::add));
                    return f;
                })
                .collect(Collectors.toList());

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("total", lista.size());
        r.put("porFecha", resumen);
        r.put("pendientes", lista);
        return r;
    }

    // ------------------------------------------------------------------ apoyos

    private boolean necesitaComprobante(Venta.TipoComprobante tipo) {
        return tipo == Venta.TipoComprobante.BOLETA || tipo == Venta.TipoComprobante.FACTURA;
    }

    /** Emitido por sí misma o dentro del comprobante del grupo con el que se vendió. */
    private boolean yaEmitido(Venta v) {
        if (comprobanteRepository.existsByVentaIdAndEstadoAndTipoDeComprobanteNot(v.getId(),
                Comprobante.EstadoComprobante.ACEPTADO, Comprobante.TipoComprobante.NOTA_CREDITO))
            return true;
        return v.getGrupoVentaId() != null
                && comprobanteRepository.existsByGrupoVentaIdAndEstadoAndTipoDeComprobanteNot(
                    v.getGrupoVentaId(),
                    Comprobante.EstadoComprobante.ACEPTADO, Comprobante.TipoComprobante.NOTA_CREDITO);
    }

    /** El total del grupo, cuando el pasaje se vendió junto a otros. */
    private BigDecimal montoDe(Venta v) {
        if (v.getGrupoVentaId() == null) return v.getPrecio();
        return ventaRepository.findByGrupoVentaId(v.getGrupoVentaId()).stream()
                .filter(x -> x.getEstado() != Venta.EstadoVenta.ANULADO)
                .map(x -> x.getPrecio() == null ? BigDecimal.ZERO : x.getPrecio())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private String fechaDe(String viajeId, String respaldo) {
        if (viajeId != null) {
            Viaje v = viajeRepository.findById(viajeId).orElse(null);
            if (v != null && v.getFechaSalida() != null) return v.getFechaSalida().toString();
        }
        return respaldo != null ? respaldo : "";
    }

    private String sucursalDe(String viajeId) {
        if (viajeId == null) return null;
        return viajeRepository.findById(viajeId).map(Viaje::getSucursalNombre).orElse(null);
    }

    private String safe(String s) { return s == null ? "" : s; }
}
