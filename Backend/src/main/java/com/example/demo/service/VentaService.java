package com.example.demo.service;

import com.example.demo.dto.VentaDTO;
import com.example.demo.dto.VentaEditRequest;
import com.example.demo.dto.VentaGrupoRequest;
import com.example.demo.dto.VentaRequest;
import com.example.demo.model.*;
import com.example.demo.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class VentaService {

    /** Tope de pasajes por operación: más que eso, conviene partir la venta. */
    private static final int MAX_PASAJEROS_GRUPO = 10;

    private final VentaRepository ventaRepository;
    private final VentaTramoUsadoRepository tramoUsadoRepository;
    private final ViajeRepository viajeRepository;
    private final UsuarioRepository usuarioRepository;
    private final AsientoService asientoService;
    private final EmailService emailService;
    private final CajaService cajaService;
    private final AuditoriaService auditoriaService;
    private final PublicService publicService;

    public VentaDTO embarcarPasajero(String id, String usuarioNombre) {
        Venta venta = ventaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));

        if (venta.getEstado() == Venta.EstadoVenta.ANULADO)
            throw new RuntimeException("La venta está anulada");

        if (venta.getEmbarqueEstado() == Venta.EmbarqueEstado.EMBARCADO)
            throw new RuntimeException("El pasajero ya embarcó");

        validarVentanaDeEmbarque(venta);

        venta.setEmbarqueEstado(Venta.EmbarqueEstado.EMBARCADO);
        venta.setEmbarcadoAt(LocalDateTime.now());
        venta.setEmbarcadoPor(usuarioNombre);

        Venta guardada = ventaRepository.save(venta);

        // Correo de confirmación al pasajero (si registró email) — no bloquea el embarque si falla
        if (guardada.getClienteEmail() != null && !guardada.getClienteEmail().isBlank()) {
            try {
                emailService.enviarConfirmacionEmbarque(
                        guardada.getClienteEmail(),
                        guardada.getPasajeroNombre(),
                        guardada.getViajeDescripcion(),
                        guardada.getAsientoTipo() + " #" + guardada.getAsientoNumero(),
                        guardada.getEmbarcadoAt().toString()
                );
            } catch (Exception e) {
                System.err.println("Error enviando correo de embarque: " + e.getMessage());
            }
        }

        return toDTO(guardada);
    }

    /**
     * El embarque solo está permitido desde 2 horas antes de la salida
     * hasta 20 minutos después de la hora programada del viaje.
     */

    private static final java.time.format.DateTimeFormatter FMT_FECHA_HORA =
            java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    /** ¿El viaje de esta venta pertenece a una ruta que se aborda en dos momentos? */
    private boolean usaPreembarque(Viaje viaje) {
        if (viaje == null || viaje.getRutaId() == null) return false;
        return rutaRepository.findById(viaje.getRutaId())
                .map(Ruta::isRequierePreembarque).orElse(false);
    }

    /**
     * Cuándo abre y cierra cada control. Devuelve {inicio, fin}.
     *
     * Va aparte y sin dependencias para poder probarlo: son reglas de reloj que
     * deciden si un pasajero sube o se queda en tierra, y equivocarse en una hora
     * no se nota hasta que hay gente parada en el muelle.
     */
    static LocalDateTime[] ventanaEmbarque(java.time.LocalDate fecha, java.time.LocalTime horaSalida,
                                           Integer minutosHastaElBote) {
        LocalDateTime salida = LocalDateTime.of(fecha, horaSalida);

        // En las rutas que se abordan en dos momentos, el bote no parte del mismo
        // sitio ni a la misma hora que el carro: sale del puerto intermedio (Nauta)
        // horas después. La ventana se ancla ahí, no en la salida de Iquitos.
        LocalDateTime partida = minutosHastaElBote != null
                ? salida.plusMinutes(minutosHastaElBote)
                : salida;

        return new LocalDateTime[]{ partida.minusHours(2), partida.plusMinutes(20) };
    }

    /** El carro se aborda en Iquitos: abre una hora antes de la salida. */
    static LocalDateTime[] ventanaPreembarque(java.time.LocalDate fecha, java.time.LocalTime horaSalida) {
        LocalDateTime salida = LocalDateTime.of(fecha, horaSalida);
        return new LocalDateTime[]{ salida.minusHours(1), salida.plusMinutes(20) };
    }

    /**
     * Minutos desde la salida hasta que el bote parte, en las rutas que se abordan
     * en dos momentos.
     *
     * El carro lleva del puerto de origen al siguiente (Iquitos → Nauta), y ahí se
     * toma el bote: por eso se mira la parada que sigue al origen y no un nombre
     * fijo, que se rompería si mañana la parada se llama distinto.
     *
     * Devuelve null si el viaje no tiene paradas cargadas; ahí se cae a la hora de
     * salida, que es el comportamiento de siempre.
     */
    private Integer minutosHastaElBote(Viaje viaje) {
        if (viaje == null) return null;
        return viajeParadaRepository.findByViajeIdOrderByOrdenAsc(viaje.getId()).stream()
                .filter(p -> p.getOrden() != null && p.getOrden() == 2)
                .map(com.example.demo.model.ViajeParada::getMinutosDesdeSalida)
                .filter(java.util.Objects::nonNull)
                .findFirst().orElse(null);
    }

    private void validarVentanaDeEmbarque(Venta venta) {
        if (venta.getViajeId() == null) return;
        Viaje viaje = viajeRepository.findById(venta.getViajeId()).orElse(null);
        if (viaje == null || viaje.getFechaSalida() == null || viaje.getHoraSalida() == null) return;

        boolean conPreembarque = usaPreembarque(viaje);
        Integer minutos = conPreembarque ? minutosHastaElBote(viaje) : null;

        LocalDateTime[] v = ventanaEmbarque(viaje.getFechaSalida(), viaje.getHoraSalida(), minutos);
        LocalDateTime ahora = LocalDateTime.now();
        String queParte = conPreembarque ? "el bote" : "el viaje";

        if (ahora.isBefore(v[0]))
            throw new RuntimeException("El embarque aún no está habilitado. Se abre el "
                    + v[0].format(FMT_FECHA_HORA) + " (2 horas antes de que parta " + queParte + ").");
        if (ahora.isAfter(v[1]))
            throw new RuntimeException("El embarque ya cerró el " + v[1].format(FMT_FECHA_HORA)
                    + " (20 minutos después de que partiera " + queParte + ").");
    }

    /**
     * Marca que el pasajero subió al carro en Iquitos.
     *
     * No manda correo: el aviso al pasajero es el del embarque al bote, que es
     * cuando el viaje de verdad empieza. Dos correos por el mismo viaje sobran.
     */
    public VentaDTO preembarcarPasajero(String id, String usuarioNombre) {
        Venta venta = ventaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));

        if (venta.getEstado() == Venta.EstadoVenta.ANULADO)
            throw new RuntimeException("La venta está anulada");
        if (venta.getPreembarqueEstado() == Venta.EmbarqueEstado.EMBARCADO)
            throw new RuntimeException("El pasajero ya pasó el pre-embarque");

        Viaje viaje = venta.getViajeId() == null ? null
                : viajeRepository.findById(venta.getViajeId()).orElse(null);
        if (!usaPreembarque(viaje))
            throw new RuntimeException("Esta ruta no usa pre-embarque");

        validarVentanaDePreembarque(viaje);

        venta.setPreembarqueEstado(Venta.EmbarqueEstado.EMBARCADO);
        venta.setPreembarcadoAt(LocalDateTime.now());
        venta.setPreembarcadoPor(usuarioNombre);
        return toDTO(ventaRepository.save(venta));
    }

    private void validarVentanaDePreembarque(Viaje viaje) {
        if (viaje == null || viaje.getFechaSalida() == null || viaje.getHoraSalida() == null) return;

        LocalDateTime[] v = ventanaPreembarque(viaje.getFechaSalida(), viaje.getHoraSalida());
        LocalDateTime salida = LocalDateTime.of(viaje.getFechaSalida(), viaje.getHoraSalida());
        LocalDateTime ahora  = LocalDateTime.now();

        if (ahora.isBefore(v[0]))
            throw new RuntimeException("El pre-embarque se abre el " + v[0].format(FMT_FECHA_HORA)
                    + " (1 hora antes de la salida: " + salida.format(FMT_FECHA_HORA) + ")");
        if (ahora.isAfter(v[1]))
            throw new RuntimeException("El pre-embarque ya cerró el " + v[1].format(FMT_FECHA_HORA) + ".");
    }

    public List<VentaDTO> listarMisEmbarquesHoy(String usuarioNombre) {
        LocalDate hoy = LocalDate.now();
        return ventaRepository.findAll().stream()
                .filter(v -> v.getEmbarqueEstado() == Venta.EmbarqueEstado.EMBARCADO)
                .filter(v -> usuarioNombre.equals(v.getEmbarcadoPor()))
                .filter(v -> v.getEmbarcadoAt() != null && v.getEmbarcadoAt().toLocalDate().isEqual(hoy))
                .sorted((a, b) -> b.getEmbarcadoAt().compareTo(a.getEmbarcadoAt()))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // Listar todas
    public List<VentaDTO> listarVentas(String usuarioNombre) {
        // Orden por creación descendente: la venta más reciente aparece primero.
        List<Venta> ventas = ventaRepository.findAllByOrderByCreatedAtDesc();

        // Cada usuario ve solo los pasajes de su sucursal (por el viaje). El ADMIN
        // y los usuarios sin sucursal asignada ven todos.
        Usuario u = usuarioNombre != null
                ? usuarioRepository.findByUsername(usuarioNombre).orElse(null) : null;
        if (u != null && u.getRol() != Rol.ADMIN && u.getSucursalId() != null) {
            java.util.Set<String> misViajes = viajeRepository.findBySucursalId(u.getSucursalId())
                    .stream().map(Viaje::getId).collect(Collectors.toSet());
            ventas = ventas.stream()
                    .filter(v -> v.getViajeId() != null && misViajes.contains(v.getViajeId()))
                    .collect(Collectors.toList());
        }
        return ventas.stream().map(this::toDTO).collect(Collectors.toList());
    }

    // Listar por viaje
    public List<VentaDTO> listarPorViaje(String viajeId) {
        return ventaRepository.findByViajeId(viajeId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // Buscar por QR
    public VentaDTO buscarPorQr(String codigoQr) {
        return ventaRepository.findByCodigoQr(codigoQr)
                .map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));
    }

    // Buscar por documento
    public List<VentaDTO> buscarPorDocumento(String documento) {
        return ventaRepository.findByPasajeroDocumento(documento)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // Ver detalle
    public VentaDTO obtenerDetalle(String id) {
        return ventaRepository.findById(id)
                .map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));
    }

    // Crear venta
    @Transactional
    public VentaDTO crearVenta(VentaRequest req, String usuarioNombre) {
        return crearVenta(req, usuarioNombre, null);
    }

    /**
     * Venta de varios pasajes en una sola operación: una familia o un grupo que viaja
     * junto se atiende de una vez, con un solo comprobante por todos.
     *
     * Cada pasajero sigue siendo una venta con su asiento, su QR y su boleto — eso no
     * cambia—, pero todas quedan unidas por un mismo grupo. Va en una sola transacción:
     * si un asiento se ocupó mientras se llenaba el formulario, no se vende ninguno a
     * medias.
     */
    @Transactional
    public List<VentaDTO> crearVentaGrupo(VentaGrupoRequest req, String usuarioNombre) {
        List<VentaRequest> pasajeros = req.getPasajeros();
        if (pasajeros == null || pasajeros.isEmpty())
            throw new RuntimeException("Agrega al menos un pasajero");
        if (pasajeros.size() > MAX_PASAJEROS_GRUPO)
            throw new RuntimeException("Se pueden vender hasta " + MAX_PASAJEROS_GRUPO
                    + " pasajes en una sola operación");

        // Dos pasajeros en el mismo asiento: el segundo chocaría al marcarlo vendido
        // y el error saldría confuso. Mejor decirlo antes de tocar nada.
        java.util.Set<Integer> vistos = new java.util.HashSet<>();
        for (VentaRequest p : pasajeros) {
            if (p.getAsientoNumero() == null)
                throw new RuntimeException("Falta elegir el asiento de " + nombreDe(p));
            if (!vistos.add(p.getAsientoNumero()))
                throw new RuntimeException("El asiento #" + p.getAsientoNumero() + " está repetido");
        }

        String grupoId = UUID.randomUUID().toString();
        List<VentaDTO> creadas = new ArrayList<>();
        for (VentaRequest p : pasajeros) {
            // Lo común no se repite por pasajero: se copia acá.
            p.setViajeId(req.getViajeId());
            p.setParadaOrigen(req.getParadaOrigen());
            p.setParadaDestino(req.getParadaDestino());
            p.setOrdenOrigen(req.getOrdenOrigen());
            p.setOrdenDestino(req.getOrdenDestino());
            p.setTipoComprobante(req.getTipoComprobante());
            p.setClienteNombre(req.getClienteNombre());
            p.setClienteTipoDoc(req.getClienteTipoDoc());
            p.setClienteDocumento(req.getClienteDocumento());
            p.setDetalleComprobante(req.getDetalleComprobante());
            p.setLugarPago(req.getLugarPago());
            p.setMetodoPago(req.getMetodoPago());
            if (p.getObservacion() == null || p.getObservacion().isBlank())
                p.setObservacion(req.getObservacion());
            if (p.getClienteEmail() == null || p.getClienteEmail().isBlank())
                p.setClienteEmail(req.getClienteEmail());

            creadas.add(crearVenta(p, usuarioNombre, grupoId));
        }

        auditoriaService.registrar("CREAR", "VENTAS", grupoId,
                "Venta de " + creadas.size() + " pasajes en una sola operación a nombre de "
                        + req.getClienteNombre());
        return creadas;
    }

    private String nombreDe(VentaRequest p) {
        return p.getPasajeroNombre() == null || p.getPasajeroNombre().isBlank()
                ? "un pasajero" : p.getPasajeroNombre();
    }

    @Transactional
    public VentaDTO crearVenta(VentaRequest req, String usuarioNombre, String grupoVentaId) {
        Viaje viaje = viajeRepository.findById(req.getViajeId())
                .orElseThrow(() -> new RuntimeException("Viaje no encontrado"));

        // Venta por sucursal: cada sucursal solo vende los viajes que salen de ella
        // (el ADMIN y los usuarios sin sucursal asignada pueden vender cualquier viaje)
        Usuario vendedor = usuarioRepository.findByUsername(usuarioNombre).orElse(null);
        if (vendedor != null
                && vendedor.getRol() != Rol.ADMIN
                && vendedor.getSucursalId() != null
                && !vendedor.getSucursalId().equals(viaje.getSucursalId())) {
            throw new RuntimeException("Solo puedes vender viajes de tu sucursal ("
                    + vendedor.getSucursalNombre() + "). Este viaje pertenece a "
                    + viaje.getSucursalNombre());
        }

        // Los tramos bloqueados de una ruta son SOLO para la compra en línea: cierran
        // la venta desatendida de un tramo, no la del mostrador, donde hay personal
        // que puede evaluar el caso. Por eso acá no se comprueban a propósito.

        Venta venta = new Venta();
        venta.setId(UUID.randomUUID().toString());
        venta.setGrupoVentaId(grupoVentaId);
        venta.setViajeId(viaje.getId());
        venta.setViajeCodigo(viaje.getCodigoViaje());
        venta.setViajeDescripcion(viaje.getRutaNombre());
        venta.setTipoDocumento(Venta.TipoDocumento.valueOf(req.getTipoDocumento()));
        venta.setPasajeroNombre(req.getPasajeroNombre());
        venta.setPasajeroDocumento(req.getPasajeroDocumento());
        venta.setProcedencia(req.getProcedencia());
        venta.setPasajeroTelefono(req.getPasajeroTelefono());
        venta.setClienteEmail(req.getClienteEmail());
        venta.setEdad(req.getEdad());
        if (req.getSexo() != null)
            venta.setSexo(Venta.Sexo.valueOf(req.getSexo()));
        venta.setObservacion(req.getObservacion());
        venta.setTipoComprobante(Venta.TipoComprobante.valueOf(req.getTipoComprobante()));
        venta.setSerieComprobante("T001");
        venta.setNumeroComprobante(generarNumeroComprobante());
        venta.setClienteNombre(req.getClienteNombre());
        venta.setClienteTipoDoc(req.getClienteTipoDoc());
        venta.setClienteDocumento(req.getClienteDocumento());
        venta.setDetalleComprobante(req.getDetalleComprobante());
        venta.setAsientoNumero(req.getAsientoNumero());
        venta.setAsientoTipo(Venta.AsientoTipo.valueOf(req.getAsientoTipo()));
        venta.setParadaOrigen(req.getParadaOrigen());
        venta.setParadaDestino(req.getParadaDestino());
        venta.setOrdenOrigen(req.getOrdenOrigen());
        venta.setOrdenDestino(req.getOrdenDestino());
        venta.setPrecio(req.getPrecio());
        // Descuento: si mandan el precio original y es mayor al cobrado, guardamos la
        // rebaja (para reportes). El ticket sigue mostrando solo `precio`.
        java.math.BigDecimal original = req.getPrecioOriginal() != null ? req.getPrecioOriginal() : req.getPrecio();
        java.math.BigDecimal descuento = java.math.BigDecimal.ZERO;
        if (original != null && req.getPrecio() != null) {
            descuento = original.subtract(req.getPrecio());
            if (descuento.signum() < 0) descuento = java.math.BigDecimal.ZERO;
        }
        venta.setPrecioOriginal(original);
        venta.setDescuento(descuento);
        venta.setLugarPago(normalizarLugarPago(req.getLugarPago()));
        venta.setMetodoPago(normalizarMetodoPago(req.getMetodoPago()));
        venta.setCodigoQr(UUID.randomUUID().toString());
        venta.setEmbarqueEstado(Venta.EmbarqueEstado.PENDIENTE);
        venta.setEstado(Venta.EstadoVenta.PAGADO);
        venta.setCanal("MOSTRADOR");   // la columna es NOT NULL; sin esto la venta falla
        venta.setFechaVenta(LocalDate.now());
        venta.setUsuarioNombre(usuarioNombre);
        venta.setCreatedAt(LocalDateTime.now());
        ventaRepository.save(venta);

        // Registrar tramos usados
        guardarTramosUsados(venta, req.getOrdenOrigen(), req.getOrdenDestino());

        // Marcar asiento como vendido
        asientoService.marcarVendido(
                viaje.getId(),
                req.getAsientoNumero(),
                venta.getId(),
                req.getPasajeroNombre(),
                req.getPasajeroDocumento(),
                req.getPasajeroTelefono(),
                req.getOrdenOrigen(),
                req.getOrdenDestino()
        );

        // Ingreso en la caja abierta del vendedor (si tiene una)
        cajaService.registrarMovimientoAutomatico(usuarioNombre,
                MovimientoCaja.TipoMovimiento.INGRESO,
                venta.getPrecio(),
                "Venta pasaje " + venta.getSerieComprobante() + "-" + venta.getNumeroComprobante()
                        + " — " + venta.getPasajeroNombre(),
                venta.getMetodoPago(),
                venta.getId());

        auditoriaService.registrar("CREAR", "VENTAS", venta.getId(),
                "Venta " + venta.getSerieComprobante() + "-" + venta.getNumeroComprobante()
                        + " a " + venta.getPasajeroNombre() + " (S/ " + venta.getPrecio()
                        + ", asiento " + venta.getAsientoTipo() + " #" + venta.getAsientoNumero() + ")");

        // El boleto sale solo, sin que el vendedor tenga que acordarse de mandarlo.
        // Si el correo falla, la venta ya está hecha y no debe caerse por eso: queda
        // el botón de reenvío en la pantalla de pasajes.
        enviarComprobanteSiSePuede(venta);

        return toDTO(venta);
    }

    // Editar datos del pasajero / comprobante de una venta (no toca asiento, tramo ni precio)
    @Transactional
    public VentaDTO editarVenta(String id, VentaEditRequest req, String usuarioNombre) {
        Venta venta = ventaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));

        if (venta.getEstado() == Venta.EstadoVenta.ANULADO)
            throw new RuntimeException("No se puede editar una venta anulada");

        if (req.getPasajeroNombre() == null || req.getPasajeroNombre().isBlank())
            throw new RuntimeException("El nombre del pasajero es obligatorio");
        if (req.getPasajeroDocumento() == null || req.getPasajeroDocumento().isBlank())
            throw new RuntimeException("El documento del pasajero es obligatorio");

        if (req.getTipoDocumento() != null)
            venta.setTipoDocumento(Venta.TipoDocumento.valueOf(req.getTipoDocumento()));
        venta.setPasajeroNombre(req.getPasajeroNombre().trim());
        venta.setPasajeroDocumento(req.getPasajeroDocumento().trim());
        venta.setProcedencia(req.getProcedencia());
        venta.setPasajeroTelefono(req.getPasajeroTelefono());
        venta.setClienteEmail(req.getClienteEmail());
        venta.setEdad(req.getEdad());
        if (req.getSexo() != null && !req.getSexo().isBlank())
            venta.setSexo(Venta.Sexo.valueOf(req.getSexo()));
        venta.setClienteNombre(req.getClienteNombre());
        venta.setClienteTipoDoc(req.getClienteTipoDoc());
        venta.setClienteDocumento(req.getClienteDocumento());
        venta.setDetalleComprobante(req.getDetalleComprobante());

        // Datos del pago: método (yape/plin/efectivo…), lugar (oficina/Iquitos) y
        // observación. El monto NO cambia. Si cambia el método, se sincroniza el
        // movimiento de caja para que el cuadre (efectivo físico vs. digital) quede
        // coherente con cómo se cobró realmente.
        String metodoAnterior = venta.getMetodoPago();
        if (req.getMetodoPago() != null && !req.getMetodoPago().isBlank())
            venta.setMetodoPago(req.getMetodoPago());
        if (req.getLugarPago() != null)
            venta.setLugarPago(req.getLugarPago());
        venta.setObservacion(req.getObservacion());
        ventaRepository.save(venta);

        boolean cambioMetodo = venta.getMetodoPago() != null
                && !venta.getMetodoPago().equals(metodoAnterior);
        if (cambioMetodo)
            cajaService.actualizarMetodoPagoDeVenta(venta.getId(), venta.getMetodoPago());

        // Mantener sincronizados los datos del pasajero en el mapa de asientos
        asientoService.actualizarDatosPasajero(id,
                req.getPasajeroNombre().trim(), req.getPasajeroDocumento().trim(), req.getPasajeroTelefono());

        auditoriaService.registrar("EDITAR", "VENTAS", venta.getId(),
                "Venta " + venta.getSerieComprobante() + "-" + venta.getNumeroComprobante()
                        + ", pasajero: " + venta.getPasajeroNombre());

        return toDTO(venta);
    }

    // Anular venta
    @Transactional
    public VentaDTO anularVenta(String id, String usuarioNombre) {
        Venta venta = ventaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));

        if (venta.getEstado() == Venta.EstadoVenta.ANULADO)
            throw new RuntimeException("La venta ya está anulada");

        venta.setEstado(Venta.EstadoVenta.ANULADO);
        venta.setAnuladaAt(LocalDateTime.now());
        ventaRepository.save(venta);

        // Liberar asiento
        asientoService.liberarAsiento(id);

        // Egreso (devolución) en la caja abierta del usuario que anula
        cajaService.registrarMovimientoAutomatico(usuarioNombre,
                MovimientoCaja.TipoMovimiento.EGRESO,
                venta.getPrecio(),
                "Anulación venta " + venta.getSerieComprobante() + "-" + venta.getNumeroComprobante()
                        + " — " + venta.getPasajeroNombre(),
                venta.getMetodoPago(),
                venta.getId());

        auditoriaService.registrar("ANULAR", "VENTAS", venta.getId(),
                "Venta " + venta.getSerieComprobante() + "-" + venta.getNumeroComprobante()
                        + " de " + venta.getPasajeroNombre() + " (S/ " + venta.getPrecio() + ")");

        return toDTO(venta);
    }

    private void guardarTramosUsados(Venta venta, int ordenOrigen, int ordenDestino) {
        List<VentaTramoUsado> tramos = new ArrayList<>();
        for (int i = ordenOrigen; i < ordenDestino; i++) {
            VentaTramoUsado t = new VentaTramoUsado();
            t.setId(UUID.randomUUID().toString());
            t.setVenta(venta);
            t.setTramo(String.valueOf(i));
            tramos.add(t);
        }
        tramoUsadoRepository.saveAll(tramos);
    }

    // Correlativo basado en el máximo emitido (count() se descuadra si se borran filas
    // y puede duplicar números con ventas simultáneas)
    private String generarNumeroComprobante() {
        long siguiente = ventaRepository.findTopByOrderByNumeroComprobanteDesc()
                .map(v -> {
                    try { return Long.parseLong(v.getNumeroComprobante()) + 1; }
                    catch (NumberFormatException e) { return ventaRepository.count() + 1; }
                })
                .orElse(1L);
        return String.format("%08d", siguiente);
    }

    private final com.example.demo.repository.RutaRepository rutaRepository;
    private final com.example.demo.repository.ViajeParadaRepository viajeParadaRepository;

    public VentaService(VentaRepository ventaRepository,
                        VentaTramoUsadoRepository tramoUsadoRepository,
                        ViajeRepository viajeRepository,
                        UsuarioRepository usuarioRepository,
                        AsientoService asientoService,
                        EmailService emailService,
                        CajaService cajaService,
                        AuditoriaService auditoriaService,
                        PublicService publicService,
                        com.example.demo.repository.RutaRepository rutaRepository,
                        com.example.demo.repository.ViajeParadaRepository viajeParadaRepository) {
        this.ventaRepository      = ventaRepository;
        this.tramoUsadoRepository = tramoUsadoRepository;
        this.viajeRepository      = viajeRepository;
        this.usuarioRepository    = usuarioRepository;
        this.asientoService       = asientoService;
        this.emailService         = emailService;
        this.cajaService          = cajaService;
        this.auditoriaService     = auditoriaService;
        this.publicService        = publicService;
        this.rutaRepository       = rutaRepository;
        this.viajeParadaRepository = viajeParadaRepository;
    }

    /**
     * Manda el boleto por correo sin dejar caer la operación si algo falla.
     * Devuelve si se pudo enviar, para poder informarlo en pantalla.
     */
    public boolean enviarComprobanteSiSePuede(Venta v) {
        if (v.getClienteEmail() == null || v.getClienteEmail().isBlank()) return false;
        try {
            enviarComprobante(v.getId());
            return true;
        } catch (Exception e) {
            System.err.println("[Venta] No se pudo enviar el boleto de "
                    + v.getSerieComprobante() + "-" + v.getNumeroComprobante() + ": " + e.getMessage());
            return false;
        }
    }

    public void enviarComprobante(String id) {
        Venta v = ventaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));

        if (v.getClienteEmail() == null || v.getClienteEmail().isEmpty())
            throw new RuntimeException("Esta venta no tiene correo registrado");

        try {
            emailService.enviarComprobante(
                    v.getClienteEmail(),
                    v.getPasajeroNombre(),
                    v.getSerieComprobante() + "-" + v.getNumeroComprobante(),
                    v.getViajeDescripcion(),
                    v.getFechaVenta() != null ? v.getFechaVenta().toString() : "—",
                    v.getAsientoTipo() + " #" + v.getAsientoNumero(),
                    v.getPrecio() != null ? v.getPrecio().toString() : "—",
                    v.getCodigoQr()
            );
        } catch (Exception e) {
            throw new RuntimeException("Error al enviar correo: " + e.getMessage());
        }
    }

    /** Igual que toDTO, pero accesible desde otros servicios/controladores. */
    public VentaDTO aDTO(Venta v) { return toDTO(v); }

    private VentaDTO toDTO(Venta v) {
        VentaDTO dto = new VentaDTO();
        dto.setId(v.getId());
        dto.setGrupoVentaId(v.getGrupoVentaId());
        dto.setViajeId(v.getViajeId());
        dto.setViajeCodigo(v.getViajeCodigo());
        dto.setViajeDescripcion(v.getViajeDescripcion());

        // Fecha y hora de salida del viaje (para el ticket y la ventana de embarque)
        if (v.getViajeId() != null) {
            viajeRepository.findById(v.getViajeId()).ifPresent(viaje -> {
                dto.setFechaSalida(viaje.getFechaSalida() != null ? viaje.getFechaSalida().toString() : null);
                dto.setHoraSalida(viaje.getHoraSalida() != null ? viaje.getHoraSalida().toString() : null);
                // La nave sale del viaje: la venta no la guarda, y en el puerto es
                // el dato que le dice al pasajero a cuál bote subir.
                dto.setEmbarcacionNombre(viaje.getEmbarcacionNombre());
            });
        }
        dto.setTipoDocumento(v.getTipoDocumento() != null ? v.getTipoDocumento().name() : null);
        dto.setPasajeroNombre(v.getPasajeroNombre());
        dto.setPasajeroDocumento(v.getPasajeroDocumento());
        dto.setProcedencia(v.getProcedencia());
        dto.setPasajeroTelefono(v.getPasajeroTelefono());
        dto.setClienteEmail(v.getClienteEmail());
        dto.setEdad(v.getEdad());
        dto.setSexo(v.getSexo() != null ? v.getSexo().name() : null);
        dto.setObservacion(v.getObservacion());
        dto.setTipoComprobante(v.getTipoComprobante() != null ? v.getTipoComprobante().name() : null);
        dto.setSerieComprobante(v.getSerieComprobante());
        dto.setNumeroComprobante(v.getNumeroComprobante());
        dto.setClienteNombre(v.getClienteNombre());
        dto.setClienteTipoDoc(v.getClienteTipoDoc());
        dto.setClienteDocumento(v.getClienteDocumento());
        dto.setDetalleComprobante(v.getDetalleComprobante());
        dto.setAsientoNumero(v.getAsientoNumero());
        dto.setAsientoTipo(v.getAsientoTipo() != null ? v.getAsientoTipo().name() : null);
        dto.setParadaOrigen(v.getParadaOrigen());
        dto.setParadaDestino(v.getParadaDestino());
        dto.setOrdenOrigen(v.getOrdenOrigen());
        dto.setOrdenDestino(v.getOrdenDestino());
        dto.setPrecio(v.getPrecio());
        dto.setPrecioOriginal(v.getPrecioOriginal());
        dto.setDescuento(v.getDescuento());
        dto.setLugarPago(v.getLugarPago());
        dto.setMetodoPago(v.getMetodoPago());
        dto.setCodigoQr(v.getCodigoQr());
        dto.setEmbarqueEstado(v.getEmbarqueEstado() != null ? v.getEmbarqueEstado().name() : null);
        dto.setEstado(v.getEstado() != null ? v.getEstado().name() : null);
        // Las ventas antiguas no tienen canal; se asumen de mostrador
        dto.setCanal(v.getCanal() != null && !v.getCanal().isBlank() ? v.getCanal() : "MOSTRADOR");
        dto.setFechaVenta(v.getFechaVenta() != null ? v.getFechaVenta().toString() : null);
        dto.setUsuarioNombre(v.getUsuarioNombre());

        if (v.getTramosUsados() != null) {
            dto.setTramosUsados(v.getTramosUsados().stream()
                    .map(VentaTramoUsado::getTramo)
                    .collect(Collectors.toList()));
        }

        dto.setCreatedAt(v.getCreatedAt() != null ? v.getCreatedAt().toString() : null);
        dto.setEmbarcadoPor(v.getEmbarcadoPor());
        dto.setEmbarcadoAt(v.getEmbarcadoAt() != null ? v.getEmbarcadoAt().toString() : null);
        dto.setPreembarqueEstado(v.getPreembarqueEstado() != null ? v.getPreembarqueEstado().name() : null);
        dto.setPreembarcadoPor(v.getPreembarcadoPor());
        dto.setPreembarcadoAt(v.getPreembarcadoAt() != null ? v.getPreembarcadoAt().toString() : null);
        // La pantalla necesita saber si esta ruta usa pre-embarque para mostrar (o no)
        // la pestaña; se resuelve acá y no en el navegador para no exponer la regla.
        if (v.getViajeId() != null)
            viajeRepository.findById(v.getViajeId())
                    .ifPresent(vi -> dto.setRequierePreembarque(usaPreembarque(vi)));
        dto.setPrecioOriginal(v.getPrecioOriginal());
        dto.setDescuento(v.getDescuento());
        dto.setLugarPago(v.getLugarPago());

        return dto;
    }

    /** Normaliza el lugar de pago a IQUITOS / REQUENA; null si no se indicó. */
    private String normalizarLugarPago(String lugar) {
        if (lugar == null || lugar.isBlank()) return null;
        String s = lugar.trim().toUpperCase();
        if (s.startsWith("IQ")) return "IQUITOS";
        if (s.startsWith("RE")) return "REQUENA";
        return s;
    }

    /** Normaliza el método de pago a EFECTIVO / YAPE / PLIN / TARJETA / TRANSFERENCIA. */
    private String normalizarMetodoPago(String metodo) {
        if (metodo == null || metodo.isBlank()) return null;
        return metodo.trim().toUpperCase();
    }
}