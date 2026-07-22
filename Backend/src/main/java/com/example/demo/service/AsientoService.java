package com.example.demo.service;

import com.example.demo.dto.AsientoDTO;
import com.example.demo.model.*;
import com.example.demo.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AsientoService {

    private final ViajeAsientoEstadoRepository asientoEstadoRepo;
    private final ViajeAsientoTramoOcupadoRepository tramoOcupadoRepo;
    private final EmbarcacionAsientoRepository embarcacionAsientoRepo;
    private final VentaRepository ventaRepository;

    public AsientoService(ViajeAsientoEstadoRepository asientoEstadoRepo,
                          ViajeAsientoTramoOcupadoRepository tramoOcupadoRepo,
                          EmbarcacionAsientoRepository embarcacionAsientoRepo,
                          VentaRepository ventaRepository) {
        this.asientoEstadoRepo    = asientoEstadoRepo;
        this.tramoOcupadoRepo     = tramoOcupadoRepo;
        this.embarcacionAsientoRepo = embarcacionAsientoRepo;
        this.ventaRepository      = ventaRepository;
    }

    // Ver todos los asientos de un viaje, con todos sus ocupantes por tramo
    public List<AsientoDTO> listarPorViaje(String viajeId) {
        List<Venta> ventas = ventaRepository.findByViajeId(viajeId).stream()
                .filter(v -> v.getEstado() == Venta.EstadoVenta.PAGADO
                          || v.getEstado() == Venta.EstadoVenta.RESERVADO)
                .collect(Collectors.toList());

        return asientoEstadoRepo.findByViajeIdOrderByNumeroAsc(viajeId).stream()
                .map(a -> {
                    AsientoDTO dto = toDTO(a);
                    dto.setOcupaciones(ventas.stream()
                            .filter(v -> a.getNumero().equals(v.getAsientoNumero()))
                            .map(this::toOcupacion)
                            .collect(Collectors.toList()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private AsientoDTO.OcupacionDTO toOcupacion(Venta v) {
        AsientoDTO.OcupacionDTO o = new AsientoDTO.OcupacionDTO();
        o.setVentaId(v.getId());
        o.setPasajeroNombre(v.getPasajeroNombre());
        o.setParadaOrigen(v.getParadaOrigen());
        o.setParadaDestino(v.getParadaDestino());
        o.setOrdenOrigen(v.getOrdenOrigen());
        o.setOrdenDestino(v.getOrdenDestino());
        o.setEstado(v.getEstado() != null ? v.getEstado().name() : null);
        return o;
    }

    // Ver asientos libres para un tramo específico
    public List<AsientoDTO> listarLibresPorTramo(String viajeId,
                                                 int ordenOrigen,
                                                 int ordenDestino) {
        return asientoEstadoRepo
                .findAsientosLibresPorTramo(viajeId, ordenOrigen, ordenDestino)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // Copiar asientos de embarcacion al crear un viaje
    @Transactional
    public void inicializarAsientosParaViaje(String viajeId, String embarcacionId) {
        List<EmbarcacionAsiento> asientos = embarcacionAsientoRepo
                .findByEmbarcacionIdOrderByNumeroAsc(embarcacionId);

        List<ViajeAsientoEstado> estados = asientos.stream().map(a -> {
            ViajeAsientoEstado e = new ViajeAsientoEstado();
            e.setId(UUID.randomUUID().toString());
            e.setViajeId(viajeId);
            e.setNumero(a.getNumero());
            e.setTipo(ViajeAsientoEstado.TipoAsiento.valueOf(a.getTipo().name()));
            e.setEstado(ViajeAsientoEstado.EstadoAsiento.LIBRE);
            return e;
        }).collect(Collectors.toList());

        asientoEstadoRepo.saveAll(estados);
    }

    // Marcar asiento como vendido al hacer una venta
    @Transactional
    public void marcarVendido(String viajeId, Integer numeroAsiento,
                              String ventaId, String pasajeroNombre,
                              String pasajeroDoc, String pasajeroTel,
                              int ordenOrigen, int ordenDestino) {

        ViajeAsientoEstado asiento = asientoEstadoRepo
                .findByViajeIdAndNumero(viajeId, numeroAsiento)
                .orElseThrow(() -> new RuntimeException("Asiento no encontrado"));

        // Verificar que ningún tramo solicitado esté ya ocupado (protege contra ventas simultáneas;
        // el índice único uk_asiento_tramo en BD es la última barrera si dos ventas llegan a la vez)
        List<String> tramosSolicitados = new ArrayList<>();
        for (int i = ordenOrigen; i < ordenDestino; i++) {
            tramosSolicitados.add(String.valueOf(i));
        }
        if (tramoOcupadoRepo.existsByViajeAsientoEstadoIdAndTramoIn(asiento.getId(), tramosSolicitados)) {
            throw new RuntimeException("El asiento #" + numeroAsiento + " ya fue vendido para ese tramo");
        }

        asiento.setEstado(ViajeAsientoEstado.EstadoAsiento.VENDIDO);
        asiento.setVentaId(ventaId);
        asiento.setPasajeroNombre(pasajeroNombre);
        asiento.setPasajeroDoc(pasajeroDoc);
        asiento.setPasajeroTel(pasajeroTel);
        asientoEstadoRepo.save(asiento);

        // Registrar los tramos ocupados
        List<ViajeAsientoTramoOcupado> tramos = new ArrayList<>();
        for (String tramo : tramosSolicitados) {
            ViajeAsientoTramoOcupado t = new ViajeAsientoTramoOcupado();
            t.setId(UUID.randomUUID().toString());
            t.setViajeAsientoEstado(asiento);
            t.setTramo(tramo);
            tramos.add(t);
        }
        tramoOcupadoRepo.saveAll(tramos);
    }

    // Reservar (retener) un asiento mientras el cliente paga en línea.
    // Igual que marcarVendido pero deja el estado en RESERVADO; los tramos ocupados
    // (con su índice único) ya bloquean a otros compradores desde este momento.
    @Transactional
    public void reservarAsiento(String viajeId, Integer numeroAsiento,
                                String ventaId, String pasajeroNombre,
                                String pasajeroDoc, String pasajeroTel,
                                int ordenOrigen, int ordenDestino) {

        ViajeAsientoEstado asiento = asientoEstadoRepo
                .findByViajeIdAndNumero(viajeId, numeroAsiento)
                .orElseThrow(() -> new RuntimeException("Asiento no encontrado"));

        List<String> tramosSolicitados = new ArrayList<>();
        for (int i = ordenOrigen; i < ordenDestino; i++) {
            tramosSolicitados.add(String.valueOf(i));
        }
        if (tramoOcupadoRepo.existsByViajeAsientoEstadoIdAndTramoIn(asiento.getId(), tramosSolicitados)) {
            throw new RuntimeException("El asiento #" + numeroAsiento + " ya no está disponible para ese tramo");
        }

        asiento.setEstado(ViajeAsientoEstado.EstadoAsiento.RESERVADO);
        asiento.setVentaId(ventaId);
        asiento.setPasajeroNombre(pasajeroNombre);
        asiento.setPasajeroDoc(pasajeroDoc);
        asiento.setPasajeroTel(pasajeroTel);
        asientoEstadoRepo.save(asiento);

        List<ViajeAsientoTramoOcupado> tramos = new ArrayList<>();
        for (String tramo : tramosSolicitados) {
            ViajeAsientoTramoOcupado t = new ViajeAsientoTramoOcupado();
            t.setId(UUID.randomUUID().toString());
            t.setViajeAsientoEstado(asiento);
            t.setTramo(tramo);
            tramos.add(t);
        }
        tramoOcupadoRepo.saveAll(tramos);
    }

    // Confirmar la venta: pasar el asiento de RESERVADO a VENDIDO (los tramos ya existen).
    // Se ubica por viaje + número porque con el asiento compartido la fila puede estar
    // apuntando al otro pasajero.
    @Transactional
    public void confirmarAsiento(String ventaId) {
        ventaRepository.findById(ventaId).ifPresent(venta ->
            asientoEstadoRepo.findByViajeIdAndNumero(venta.getViajeId(), venta.getAsientoNumero())
                .ifPresent(asiento -> {
                    asiento.setEstado(ViajeAsientoEstado.EstadoAsiento.VENDIDO);
                    asientoEstadoRepo.save(asiento);
                }));
    }

    // Sincronizar datos del pasajero en el asiento al editar una venta.
    // Solo si la fila representa a ESTE pasajero; si muestra al otro ocupante, no se pisa.
    @Transactional
    public void actualizarDatosPasajero(String ventaId, String nombre, String doc, String tel) {
        asientoEstadoRepo.findByVentaId(ventaId).ifPresent(asiento -> {
            asiento.setPasajeroNombre(nombre);
            asiento.setPasajeroDoc(doc);
            asiento.setPasajeroTel(tel);
            asientoEstadoRepo.save(asiento);
        });
    }

    /**
     * Libera SOLO los tramos de esta venta. Un asiento puede llevar a varios pasajeros
     * en tramos distintos, así que anular a uno no debe soltar el tramo del otro:
     * el asiento vuelve a LIBRE únicamente cuando ya no le queda ningún tramo ocupado.
     */
    @Transactional
    public void liberarAsiento(String ventaId) {
        Venta venta = ventaRepository.findById(ventaId)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));

        // Se busca por viaje + número, no por ventaId: con el asiento compartido, la
        // fila apunta a uno solo de los pasajeros.
        ViajeAsientoEstado asiento = asientoEstadoRepo
                .findByViajeIdAndNumero(venta.getViajeId(), venta.getAsientoNumero())
                .orElseThrow(() -> new RuntimeException("Asiento no encontrado"));

        List<String> tramosDeLaVenta = tramosDe(venta.getOrdenOrigen(), venta.getOrdenDestino());
        if (!tramosDeLaVenta.isEmpty())
            tramoOcupadoRepo.deleteByViajeAsientoEstadoIdAndTramoIn(asiento.getId(), tramosDeLaVenta);
        else
            tramoOcupadoRepo.deleteByViajeAsientoEstadoId(asiento.getId());

        reasignarOcupante(asiento, ventaId);
    }

    /**
     * Deja el asiento apuntando a alguno de los pasajeros que le quedan; si no queda
     * ninguno, lo devuelve a LIBRE.
     */
    private void reasignarOcupante(ViajeAsientoEstado asiento, String ventaLiberada) {
        boolean quedanTramos = !tramoOcupadoRepo.findByViajeAsientoEstadoId(asiento.getId()).isEmpty();

        if (!quedanTramos) {
            asiento.setEstado(ViajeAsientoEstado.EstadoAsiento.LIBRE);
            asiento.setVentaId(null);
            asiento.setPasajeroNombre(null);
            asiento.setPasajeroDoc(null);
            asiento.setPasajeroTel(null);
            asientoEstadoRepo.save(asiento);
            return;
        }

        // Si la fila apuntaba a la venta anulada, se repunta a otro pasajero vigente
        if (ventaLiberada.equals(asiento.getVentaId())) {
            ventasVigentesDelAsiento(asiento).stream()
                    .filter(v -> !v.getId().equals(ventaLiberada))
                    .findFirst()
                    .ifPresent(v -> {
                        asiento.setVentaId(v.getId());
                        asiento.setPasajeroNombre(v.getPasajeroNombre());
                        asiento.setPasajeroDoc(v.getPasajeroDocumento());
                        asiento.setPasajeroTel(v.getPasajeroTelefono());
                    });
        }
        asientoEstadoRepo.save(asiento);
    }

    /** Ventas vivas (pagadas o reservadas) que ocupan este asiento. */
    private List<Venta> ventasVigentesDelAsiento(ViajeAsientoEstado asiento) {
        return ventaRepository.findByViajeId(asiento.getViajeId()).stream()
                .filter(v -> asiento.getNumero().equals(v.getAsientoNumero()))
                .filter(v -> v.getEstado() == Venta.EstadoVenta.PAGADO
                          || v.getEstado() == Venta.EstadoVenta.RESERVADO)
                .collect(Collectors.toList());
    }

    /** Tramos que cubre un recorrido: de [origen, destino) uno por cada salto. */
    private List<String> tramosDe(Integer ordenOrigen, Integer ordenDestino) {
        List<String> tramos = new ArrayList<>();
        if (ordenOrigen == null || ordenDestino == null) return tramos;
        for (int i = ordenOrigen; i < ordenDestino; i++) tramos.add(String.valueOf(i));
        return tramos;
    }

    private AsientoDTO toDTO(ViajeAsientoEstado a) {
        AsientoDTO dto = new AsientoDTO();
        dto.setId(a.getId());
        dto.setNumero(a.getNumero());
        dto.setTipo(a.getTipo() != null ? a.getTipo().name() : null);
        dto.setEstado(a.getEstado() != null ? a.getEstado().name() : null);
        dto.setPasajeroNombre(a.getPasajeroNombre());
        dto.setPasajeroDoc(a.getPasajeroDoc());

        if (a.getTramosOcupados() != null) {
            dto.setTramosOcupados(a.getTramosOcupados().stream()
                    .map(ViajeAsientoTramoOcupado::getTramo)
                    .collect(Collectors.toList()));
        }

        return dto;
    }
}