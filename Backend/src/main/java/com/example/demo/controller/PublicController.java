package com.example.demo.controller;

import com.example.demo.dto.AnuncioDTO;
import com.example.demo.dto.BeneficiosDTO;
import com.example.demo.dto.PublicAsientoDTO;
import com.example.demo.dto.PublicRutaDTO;
import com.example.demo.dto.PublicViajeDTO;
import com.example.demo.model.Anuncio;
import com.example.demo.service.AnuncioService;
import com.example.demo.service.CategoriaPasajero;
import com.example.demo.service.ClienteService;
import com.example.demo.service.PublicService;
import com.example.demo.service.WalletService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * API pública (sin autenticación) para la web del cliente: rutas, búsqueda de viajes
 * y mapa de asientos. Solo lectura.
 */
@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final PublicService publicService;
    private final ClienteService clienteService;
    private final AnuncioService anuncioService;
    private final WalletService walletService;
    private final CategoriaPasajero categorias;

    public PublicController(PublicService publicService, ClienteService clienteService,
                            AnuncioService anuncioService, WalletService walletService,
                            CategoriaPasajero categorias) {
        this.publicService = publicService;
        this.clienteService = clienteService;
        this.anuncioService = anuncioService;
        this.walletService = walletService;
        this.categorias = categorias;
    }

    /**
     * Qué beneficios puede anunciar la web hoy.
     *
     * <p>Lo pide la página de inicio para decidir si cuenta la wallet y el
     * programa de pasajero frecuente, y con qué números. Si están apagados
     * contesta que no y la página no anuncia nada: un beneficio que se promete
     * antes de existir se cobra en el mostrador.
     */
    @GetMapping("/beneficios")
    public ResponseEntity<BeneficiosDTO> beneficios() {
        List<BeneficiosDTO.Escalon> escalones = categorias.escalones().stream()
                .map(e -> new BeneficiosDTO.Escalon(e.nombre(), e.viajes(), e.descuento()))
                .toList();
        return ResponseEntity.ok(new BeneficiosDTO(
                walletService.estaHabilitada(),
                categorias.estaHabilitada(),
                escalones,
                categorias.mesesDeLaVentana()));
    }

    /** Anuncios activos y vigentes de un tipo (BARRA, MODAL o LANDING). */
    @GetMapping("/anuncios")
    public ResponseEntity<List<AnuncioDTO>> anuncios(@RequestParam String tipo) {
        Anuncio.Tipo t;
        try {
            t = Anuncio.Tipo.valueOf(tipo);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(anuncioService.listarActivosPorTipo(t));
    }

    /** Rutas activas con paradas y tramos (para los combos Desde/Hacia). */
    @GetMapping("/rutas")
    public ResponseEntity<List<PublicRutaDTO>> rutas() {
        return ResponseEntity.ok(publicService.listarRutas());
    }

    /** Ciudades/paradas disponibles (respaldo para autocompletar). */
    @GetMapping("/ubicaciones")
    public ResponseEntity<List<String>> ubicaciones() {
        return ResponseEntity.ok(publicService.listarUbicaciones());
    }

    /** Busca viajes disponibles. origen, destino y fecha son opcionales. */
    @GetMapping("/viajes")
    public ResponseEntity<List<PublicViajeDTO>> buscarViajes(
            @RequestParam(required = false) String origen,
            @RequestParam(required = false) String destino,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return ResponseEntity.ok(publicService.buscarViajes(origen, destino, fecha));
    }

    /** Precio más bajo por día en un rango, para la tira de fechas de la web. */
    @GetMapping("/viajes/precios")
    public ResponseEntity<List<com.example.demo.dto.PrecioFechaDTO>> preciosPorFecha(
            @RequestParam String origen,
            @RequestParam String destino,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return ResponseEntity.ok(publicService.preciosPorFecha(origen, destino, desde, hasta));
    }

    /** Mapa completo de asientos del viaje, marcando cuáles están libres en el tramo. */
    @GetMapping("/viajes/{viajeId}/asientos")
    public ResponseEntity<List<PublicAsientoDTO>> asientos(
            @PathVariable String viajeId,
            @RequestParam int ordenOrigen,
            @RequestParam int ordenDestino) {
        return ResponseEntity.ok(publicService.mapaAsientos(viajeId, ordenOrigen, ordenDestino));
    }

    /** Tramos que no se venden (orden de gerencia), para ocultarlos en el buscador. */
    @GetMapping("/reglas-venta")
    public ResponseEntity<?> reglasVenta() {
        List<List<String>> pares = publicService.paresBloqueados().stream()
                .map(p -> List.of(p[0], p[1]))
                .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("paresBloqueados", pares));
    }

    /** Historial de boletos por correo o DNI, sin necesidad de cuenta. */
    @GetMapping("/boletos")
    public ResponseEntity<?> boletos(@RequestParam(required = false) String correo,
                                     @RequestParam(required = false) String documento) {
        return ResponseEntity.ok(clienteService.buscarBoletos(correo, documento));
    }
}
