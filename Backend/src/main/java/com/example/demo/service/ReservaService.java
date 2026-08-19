package com.example.demo.service;

import com.example.demo.dto.ComprobanteDTO;
import com.example.demo.dto.ComprobanteRequest;
import com.example.demo.dto.ConfirmacionDTO;
import com.example.demo.dto.ConfirmacionGrupoDTO;
import com.example.demo.dto.ReservaGrupoRequest;
import com.example.demo.dto.ReservaGrupoResponse;
import com.example.demo.dto.ReservaRequest;
import com.example.demo.dto.ReservaResponse;
import com.example.demo.dto.TicketDTO;
import com.example.demo.model.Ruta;
import com.example.demo.model.RutaTarifaTramo;
import com.example.demo.model.Venta;
import com.example.demo.model.VentaTramoUsado;
import com.example.demo.model.Viaje;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.repository.RutaTarifaTramoRepository;
import com.example.demo.repository.VentaRepository;
import com.example.demo.repository.VentaTramoUsadoRepository;
import com.example.demo.repository.ViajeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Compra en línea del cliente: crea una reserva que RETIENE el asiento y luego
 * procesa el pago con Izipay. Independiente de la venta del personal (no usa caja).
 */
@Service
public class ReservaService {

    /** Minutos que se sostiene el asiento sin pagar antes de liberarlo. */
    private static final int MINUTOS_RESERVA = 15;

    /** Tope de pasajes por compra en línea (una familia; no acapara medio bote). */
    private static final int MAX_PASAJEROS = 5;

    /** Con qué se pagó en línea. Junto a canal=WEB dice también por qué pasarela
     *  entró la plata: TARJETA la cobra Izipay y YAPE la cobra Mercado Pago. */
    private static final String METODO_IZIPAY = "TARJETA";
    private static final String METODO_YAPE   = "YAPE";

    /**
     * Si es false, la venta web no emite boleta/factura en Nubefact (solo ticket con QR).
     * Útil en pruebas para no consumir correlativos reales. Se controla por entorno.
     */
    @Value("${app.venta-web.emitir-comprobante:true}")
    private boolean emitirComprobanteWeb;

    private final ViajeRepository viajeRepository;
    private final VentaRepository ventaRepository;
    private final VentaTramoUsadoRepository tramoUsadoRepository;
    private final RutaTarifaTramoRepository tarifaRepository;
    private final ClienteRepository clienteRepository;
    private final AsientoService asientoService;
    private final IzipayService izipayService;
    private final MercadoPagoService mercadoPagoService;
    private final VentaService ventaService;
    private final ComprobanteService comprobanteService;
    private final PublicService publicService;

    public ReservaService(ViajeRepository viajeRepository,
                          VentaRepository ventaRepository,
                          VentaTramoUsadoRepository tramoUsadoRepository,
                          RutaTarifaTramoRepository tarifaRepository,
                          ClienteRepository clienteRepository,
                          AsientoService asientoService,
                          IzipayService izipayService,
                          MercadoPagoService mercadoPagoService,
                          VentaService ventaService,
                          ComprobanteService comprobanteService,
                          PublicService publicService) {
        this.comprobanteService = comprobanteService;
        this.publicService = publicService;
        this.viajeRepository = viajeRepository;
        this.ventaRepository = ventaRepository;
        this.tramoUsadoRepository = tramoUsadoRepository;
        this.tarifaRepository = tarifaRepository;
        this.clienteRepository = clienteRepository;
        this.asientoService = asientoService;
        this.izipayService = izipayService;
        this.mercadoPagoService = mercadoPagoService;
        this.ventaService = ventaService;
    }

    @Transactional
    public ReservaResponse crearReserva(ReservaRequest req, String clienteEmailAutenticado) {
        Viaje viaje = viajeRepository.findById(req.getViajeId())
                .orElseThrow(() -> new RuntimeException("Viaje no encontrado"));
        verificarViajeVendible(viaje);

        Venta v = reservarUno(viaje, req, clienteEmailAutenticado);

        ReservaResponse resp = new ReservaResponse();
        resp.setReservaId(v.getId());
        resp.setMonto(v.getPrecio());
        resp.setMontoCents(v.getPrecio().multiply(BigDecimal.valueOf(100)).intValueExact());
        resp.setMoneda("PEN");
        resp.setExpiraEn(v.getReservaExpira().toString());
        resp.setDescripcion("Pasaje " + safe(req.getParadaOrigen()) + " → " + safe(req.getParadaDestino())
                + " · Asiento #" + req.getAsientoNumero());
        return resp;
    }

    /**
     * Reserva de varios pasajes en una sola compra (hasta {@value #MAX_PASAJEROS}).
     * Cada pasajero ocupa su asiento y todos se pagan juntos; devuelve la lista de
     * reservas y el total. Los datos de contacto y comprobante son comunes al grupo.
     */
    @Transactional
    public ReservaGrupoResponse crearReservaGrupo(ReservaGrupoRequest req, String clienteEmailAutenticado) {
        Viaje viaje = viajeRepository.findById(req.getViajeId())
                .orElseThrow(() -> new RuntimeException("Viaje no encontrado"));
        verificarViajeVendible(viaje);

        List<ReservaRequest> pasajeros = req.getPasajeros();
        if (pasajeros == null || pasajeros.isEmpty())
            throw new RuntimeException("Agrega al menos un pasajero");
        if (pasajeros.size() > MAX_PASAJEROS)
            throw new RuntimeException("Puedes comprar hasta " + MAX_PASAJEROS + " pasajes por compra");

        // Asientos distintos entre sí: si el mismo asiento va dos veces, el segundo
        // choca contra el primero al retenerlo y da un error confuso.
        Set<Integer> vistos = new HashSet<>();
        for (ReservaRequest p : pasajeros) {
            if (p.getAsientoNumero() == null)
                throw new RuntimeException("Selecciona un asiento para cada pasajero");
            if (!vistos.add(p.getAsientoNumero()))
                throw new RuntimeException("El asiento #" + p.getAsientoNumero() + " está repetido");
        }

        List<String> ids = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        LocalDateTime expira = null;
        for (ReservaRequest p : pasajeros) {
            // Los datos comunes (tramo, contacto, comprobante) se copian a cada pasajero.
            p.setViajeId(req.getViajeId());
            p.setOrdenOrigen(req.getOrdenOrigen());
            p.setOrdenDestino(req.getOrdenDestino());
            p.setParadaOrigen(req.getParadaOrigen());
            p.setParadaDestino(req.getParadaDestino());
            p.setClienteEmail(req.getClienteEmail());
            p.setTipoComprobante(req.getTipoComprobante());
            p.setClienteNombre(req.getClienteNombre());
            p.setClienteDocumento(req.getClienteDocumento());

            Venta v = reservarUno(viaje, p, clienteEmailAutenticado);
            ids.add(v.getId());
            total = total.add(v.getPrecio());
            expira = v.getReservaExpira();
        }

        ReservaGrupoResponse resp = new ReservaGrupoResponse();
        resp.setReservaIds(ids);
        resp.setMontoTotal(total);
        resp.setMontoCents(total.multiply(BigDecimal.valueOf(100)).intValueExact());
        resp.setMoneda("PEN");
        resp.setExpiraEn(expira != null ? expira.toString() : null);
        resp.setCantidad(ids.size());
        resp.setDescripcion(ids.size() + (ids.size() == 1 ? " pasaje " : " pasajes ")
                + safe(req.getParadaOrigen()) + " → " + safe(req.getParadaDestino()));
        return resp;
    }

    /** El viaje debe estar programado y no haber salido (mismo criterio del buscador). */
    private void verificarViajeVendible(Viaje viaje) {
        if (viaje.getEstado() != Viaje.EstadoViaje.PROGRAMADO)
            throw new RuntimeException("Este viaje ya no está disponible para la venta");
        // Si el filtro solo estuviera en la búsqueda, una página abierta hace rato
        // (o una llamada directa a la API) podría vender un pasaje de un bote que ya zarpó.
        if (!publicService.seVendeTodavia(viaje))
            throw new RuntimeException("Este viaje ya salió o está por salir. Elige otra fecha.");
    }

    /**
     * Crea y retiene UNA reserva (un asiento) sobre un viaje ya validado. Es el núcleo
     * compartido por la compra de un pasaje y por la compra de varios.
     */
    private Venta reservarUno(Viaje viaje, ReservaRequest req, String clienteEmailAutenticado) {
        if (req.getAsientoNumero() == null)
            throw new RuntimeException("Selecciona un asiento");
        if (req.getOrdenOrigen() == null || req.getOrdenDestino() == null
                || req.getOrdenOrigen() >= req.getOrdenDestino())
            throw new RuntimeException("Tramo (origen/destino) inválido");
        if (publicService.tramoBloqueado(req.getParadaOrigen(), req.getParadaDestino()))
            throw new RuntimeException("Ese tramo no está disponible para la venta.");
        if (publicService.tramoBloqueadoEnRuta(viaje.getRutaId(), req.getOrdenOrigen(), req.getOrdenDestino()))
            throw new RuntimeException("Ese tramo no está disponible para esta ruta.");
        if (vacio(req.getPasajeroNombre()) || vacio(req.getPasajeroDocumento()))
            throw new RuntimeException("Ingresa el nombre y documento de cada pasajero");
        if (vacio(req.getClienteEmail()) || !req.getClienteEmail().contains("@"))
            throw new RuntimeException("Ingresa un correo válido");

        // Se valida acá y no al pagar: si faltan datos, el cliente lo corrige antes
        // de que se le cobre, no después.
        validarDatosDelComprobante(req);

        boolean vip = "VIP".equalsIgnoreCase(req.getAsientoTipo());
        BigDecimal precio = calcularPrecio(viaje, req.getOrdenOrigen(), req.getOrdenDestino(), vip);
        if (precio == null)
            throw new RuntimeException("No se pudo determinar la tarifa de este tramo");

        Venta v = new Venta();
        v.setId(UUID.randomUUID().toString());
        v.setViajeId(viaje.getId());
        v.setViajeCodigo(viaje.getCodigoViaje());
        v.setViajeDescripcion(viaje.getRutaNombre());
        v.setTipoDocumento(parseTipoDoc(req.getTipoDocumento()));
        v.setPasajeroNombre(req.getPasajeroNombre().trim());
        v.setPasajeroDocumento(req.getPasajeroDocumento().trim());
        v.setPasajeroTelefono(req.getPasajeroTelefono());
        v.setClienteEmail(req.getClienteEmail().trim());
        v.setEdad(req.getEdad());
        if (req.getSexo() != null && !req.getSexo().isBlank())
            v.setSexo(Venta.Sexo.valueOf(req.getSexo()));
        v.setTipoComprobante(parseComprobante(req.getTipoComprobante()));
        v.setSerieComprobante("T001");
        v.setNumeroComprobante(generarNumeroComprobante());
        v.setClienteNombre(req.getClienteNombre());
        v.setClienteDocumento(req.getClienteDocumento());
        v.setAsientoNumero(req.getAsientoNumero());
        v.setAsientoTipo(vip ? Venta.AsientoTipo.VIP : Venta.AsientoTipo.NORMAL);
        v.setParadaOrigen(req.getParadaOrigen());
        v.setParadaDestino(req.getParadaDestino());
        v.setOrdenOrigen(req.getOrdenOrigen());
        v.setOrdenDestino(req.getOrdenDestino());
        v.setPrecio(precio);
        v.setCodigoQr(UUID.randomUUID().toString());
        v.setEmbarqueEstado(Venta.EmbarqueEstado.PENDIENTE);
        v.setEstado(Venta.EstadoVenta.RESERVADO);
        v.setCanal("WEB");
        v.setReservaExpira(LocalDateTime.now().plusMinutes(MINUTOS_RESERVA));
        v.setFechaVenta(LocalDate.now());
        v.setCreatedAt(LocalDateTime.now());

        if (clienteEmailAutenticado != null) {
            clienteRepository.findByEmail(clienteEmailAutenticado.toLowerCase())
                    .ifPresent(c -> v.setClienteId(c.getId()));
        }

        ventaRepository.save(v);
        guardarTramosUsados(v, req.getOrdenOrigen(), req.getOrdenDestino());

        // Retiene el asiento (el índice único de tramos bloquea a otros compradores).
        asientoService.reservarAsiento(
                viaje.getId(), req.getAsientoNumero(), v.getId(),
                v.getPasajeroNombre(), v.getPasajeroDocumento(), v.getPasajeroTelefono(),
                req.getOrdenOrigen(), req.getOrdenDestino());
        return v;
    }

    /** Datos completos de un boleto para imprimir el ticket de embarque (80mm/A4). */
    @Transactional(readOnly = true)
    public TicketDTO datosTicket(String ventaId) {
        Venta v = ventaRepository.findById(ventaId)
                .orElseThrow(() -> new RuntimeException("Boleto no encontrado"));
        TicketDTO t = new TicketDTO();
        t.id = v.getId();
        t.serieComprobante = v.getSerieComprobante();
        t.numeroComprobante = v.getNumeroComprobante();
        t.viajeCodigo = v.getViajeCodigo();
        t.paradaOrigen = v.getParadaOrigen();
        t.paradaDestino = v.getParadaDestino();
        t.asientoNumero = v.getAsientoNumero();
        t.asientoTipo = v.getAsientoTipo() != null ? v.getAsientoTipo().name() : null;
        t.pasajeroNombre = v.getPasajeroNombre();
        t.tipoDocumento = v.getTipoDocumento() != null ? v.getTipoDocumento().name() : null;
        t.pasajeroDocumento = v.getPasajeroDocumento();
        t.edad = v.getEdad();
        t.sexo = v.getSexo() != null ? v.getSexo().name() : null;
        t.procedencia = v.getProcedencia();
        t.pasajeroTelefono = v.getPasajeroTelefono();
        t.precio = v.getPrecio();
        t.codigoQr = v.getCodigoQr();
        t.fechaVenta = v.getFechaVenta() != null ? v.getFechaVenta().toString() : null;
        t.clienteNombre = v.getClienteNombre();
        t.clienteTipoDoc = v.getClienteTipoDoc();
        t.clienteDocumento = v.getClienteDocumento();
        if (v.getViajeId() != null) {
            viajeRepository.findById(v.getViajeId()).ifPresent(viaje -> {
                t.fechaSalida = viaje.getFechaSalida() != null ? viaje.getFechaSalida().toString() : null;
                t.horaSalida = viaje.getHoraSalida() != null ? viaje.getHoraSalida().toString() : null;
            });
        }
        return t;
    }

    /**
     * Reservas que siguen esperando pago, para la página que abre el cliente desde el
     * correo de aviso. Se piden por id (UUID), no por número de pedido: el id no se
     * puede adivinar, así que el enlace del correo sirve sin pedir sesión.
     *
     * Devuelve solo lo necesario para mostrar el resumen y cobrar; nada de datos
     * sensibles del comprador.
     */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> pendientesPorIds(List<String> ids) {
        java.util.Map<String, Object> r = new java.util.LinkedHashMap<>();
        List<java.util.Map<String, Object>> items = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        LocalDateTime expira = null;
        boolean algunoPagado = false;

        for (String id : ids) {
            Venta v = ventaRepository.findById(id).orElse(null);
            if (v == null) continue;
            if (v.getEstado() == Venta.EstadoVenta.PAGADO) { algunoPagado = true; continue; }
            if (v.getEstado() != Venta.EstadoVenta.RESERVADO) continue;
            if (v.getReservaExpira() != null && LocalDateTime.now().isAfter(v.getReservaExpira())) continue;

            java.util.Map<String, Object> i = new java.util.LinkedHashMap<>();
            i.put("reservaId", v.getId());
            i.put("pasajeroNombre", v.getPasajeroNombre());
            i.put("asientoNumero", v.getAsientoNumero());
            i.put("asientoTipo", v.getAsientoTipo() != null ? v.getAsientoTipo().name() : null);
            i.put("precio", v.getPrecio());
            items.add(i);

            total = total.add(v.getPrecio() == null ? BigDecimal.ZERO : v.getPrecio());
            if (expira == null || (v.getReservaExpira() != null && v.getReservaExpira().isBefore(expira)))
                expira = v.getReservaExpira();

            if (r.isEmpty()) {
                r.put("origen", v.getParadaOrigen());
                r.put("destino", v.getParadaDestino());
                if (v.getViajeId() != null) {
                    Viaje viaje = viajeRepository.findById(v.getViajeId()).orElse(null);
                    if (viaje != null) {
                        r.put("fechaSalida", viaje.getFechaSalida() != null ? viaje.getFechaSalida().toString() : null);
                        r.put("horaSalida", viaje.getHoraSalida() != null ? viaje.getHoraSalida().toString() : null);
                        r.put("embarcacionNombre", viaje.getEmbarcacionNombre());
                    }
                }
            }
        }

        r.put("items", items);
        r.put("reservaIds", items.stream().map(i -> (String) i.get("reservaId")).toList());
        r.put("total", total);
        r.put("expiraEn", expira != null ? expira.toString() : null);
        r.put("yaPagado", items.isEmpty() && algunoPagado);
        return r;
    }

    /** Qué medios de pago están configurados, con las claves públicas del navegador. */
    public java.util.Map<String, Object> metodosDePago() {
        java.util.Map<String, Object> tarjeta = new java.util.LinkedHashMap<>();
        tarjeta.put("habilitado", true);
        tarjeta.put("simulado", !izipayService.estaActiva());

        java.util.Map<String, Object> yape = new java.util.LinkedHashMap<>();
        yape.put("habilitado", true);
        yape.put("simulado", !mercadoPagoService.estaActiva());
        yape.put("publicKey", mercadoPagoService.getPublicKey());
        // Con credenciales de prueba el código real de la app de Yape no sirve: hay
        // que usar los celulares de prueba de Mercado Pago, y conviene decirlo en pantalla
        yape.put("prueba", mercadoPagoService.esDePrueba());

        java.util.Map<String, Object> r = new java.util.LinkedHashMap<>();
        r.put("tarjeta", tarjeta);
        r.put("yape", yape);
        return r;
    }

    /**
     * Paso previo al pago: pide a Izipay el formulario para esta reserva. Se hace acá
     * y no en el navegador porque requiere las credenciales de la tienda.
     */
    @Transactional(readOnly = true)
    public IzipayService.Formulario prepararPago(String reservaId) {
        Venta v = ventaRepository.findById(reservaId)
                .orElseThrow(() -> new RuntimeException("Reserva no encontrada"));

        if (v.getEstado() == Venta.EstadoVenta.PAGADO)
            throw new RuntimeException("Esta compra ya estaba pagada");
        if (v.getEstado() != Venta.EstadoVenta.RESERVADO)
            throw new RuntimeException("La reserva no está disponible para pago");
        if (v.getReservaExpira() != null && LocalDateTime.now().isAfter(v.getReservaExpira()))
            throw new RuntimeException("La reserva expiró. Vuelve a elegir tu asiento.");

        int cents = v.getPrecio().multiply(BigDecimal.valueOf(100)).intValueExact();
        String orden = v.getSerieComprobante() + "-" + v.getNumeroComprobante();
        v.setOrdenPago(orden);
        ventaRepository.save(v);
        return izipayService.crearFormulario(
                orden,
                cents, v.getClienteEmail(), v.getPasajeroNombre(),
                v.getPasajeroDocumento(), v.getPasajeroTelefono());
    }

    @Transactional
    public ConfirmacionDTO pagarReserva(String reservaId, String krAnswer, String krHash) {
        Venta v = reservaLista(reservaId);
        if (v == null) return confirmacion(ventaRepository.findById(reservaId).orElseThrow(),
                                           false, "Esta compra ya estaba pagada");

        // Izipay cobra en el navegador; acá solo se comprueba que la confirmación sea
        // auténtica y diga que el pedido quedó pagado.
        IzipayService.Resultado pago = izipayService.verificarPago(krAnswer, krHash);
        if (!pago.pagado)
            throw new RuntimeException(pago.motivo != null ? pago.motivo : "El pago no se pudo confirmar");

        return confirmarPago(v, pago.referencia, METODO_IZIPAY);
    }

    /**
     * Pago con Yape por Mercado Pago. A diferencia de Izipay, acá el cobro lo hace
     * este servidor con el token que generó el navegador a partir del celular y el
     * código de aprobación.
     */
    @Transactional
    public ConfirmacionDTO pagarConYape(String reservaId, String token) {
        Venta v = reservaLista(reservaId);
        if (v == null) return confirmacion(ventaRepository.findById(reservaId).orElseThrow(),
                                           false, "Esta compra ya estaba pagada");

        String descripcion = "Pasaje Rayza " + safe(v.getParadaOrigen()) + " → " + safe(v.getParadaDestino());

        // El id de la reserva como clave de idempotencia: si el cliente reintenta,
        // Mercado Pago devuelve el mismo pago en vez de cobrar dos veces.
        MercadoPagoService.Resultado pago = mercadoPagoService.pagar(
                token, v.getPrecio(), descripcion, v.getClienteEmail(), reservaId);

        if (!pago.pagado)
            throw new RuntimeException(pago.motivo != null ? pago.motivo : "El pago con Yape no se pudo confirmar");

        return confirmarPago(v, pago.referencia, METODO_YAPE);
    }

    // ----------------------------------------------------------------------------
    // Pago de un grupo de reservas (varios pasajes en un solo cobro)
    // ----------------------------------------------------------------------------

    /** Paso previo del pago con tarjeta del grupo: un solo formulario por el total. */
    @Transactional(readOnly = true)
    public IzipayService.Formulario prepararPagoGrupo(List<String> reservaIds) {
        List<Venta> ventas = cargarGrupo(reservaIds);
        BigDecimal total = BigDecimal.ZERO;
        for (Venta v : ventas) {
            if (v.getEstado() == Venta.EstadoVenta.PAGADO)
                throw new RuntimeException("Esta compra ya estaba pagada");
            if (v.getEstado() != Venta.EstadoVenta.RESERVADO)
                throw new RuntimeException("La reserva no está disponible para pago");
            if (v.getReservaExpira() != null && LocalDateTime.now().isAfter(v.getReservaExpira()))
                throw new RuntimeException("La reserva expiró. Vuelve a elegir tus asientos.");
            total = total.add(v.getPrecio());
        }
        Venta primera = ventas.get(0);
        int cents = total.multiply(BigDecimal.valueOf(100)).intValueExact();
        // Un orderId de grupo: Izipay verifica firma + estado, no cruza el orderId,
        // así que un solo formulario cobra el total de todo el grupo.
        String ordenGrupo = "GRP-" + reservaIds.get(0);
        for (Venta v : ventas) { v.setOrdenPago(ordenGrupo); ventaRepository.save(v); }
        return izipayService.crearFormulario(
                ordenGrupo, cents, primera.getClienteEmail(),
                primera.getPasajeroNombre(), primera.getPasajeroDocumento(), primera.getPasajeroTelefono());
    }

    /** Confirma el pago con tarjeta del grupo (Izipay) y cierra todas las reservas. */
    @Transactional
    public ConfirmacionGrupoDTO pagarGrupo(List<String> reservaIds, String krAnswer, String krHash) {
        List<Venta> pendientes = grupoPendiente(reservaIds);
        if (pendientes.isEmpty())
            return confirmarPagoGrupo(reservaIds, pendientes, null, null);   // ya estaba pagado (reintento)

        IzipayService.Resultado pago = izipayService.verificarPago(krAnswer, krHash);
        if (!pago.pagado)
            throw new RuntimeException(pago.motivo != null ? pago.motivo : "El pago no se pudo confirmar");

        return confirmarPagoGrupo(reservaIds, pendientes, pago.referencia, METODO_IZIPAY);
    }

    /** Pago del grupo con Yape: un solo cobro por el total, con idempotencia por grupo. */
    @Transactional
    public ConfirmacionGrupoDTO pagarGrupoYape(List<String> reservaIds, String token) {
        List<Venta> pendientes = grupoPendiente(reservaIds);
        if (pendientes.isEmpty())
            return confirmarPagoGrupo(reservaIds, pendientes, null, null);

        BigDecimal total = BigDecimal.ZERO;
        for (Venta v : pendientes) total = total.add(v.getPrecio());

        Venta primera = pendientes.get(0);
        String descripcion = "Pasajes Rayza " + safe(primera.getParadaOrigen()) + " → "
                + safe(primera.getParadaDestino()) + " (" + pendientes.size() + ")";

        // El primer id como clave de idempotencia: si el cliente reintenta, Mercado
        // Pago devuelve el mismo pago en vez de cobrar dos veces el total del grupo.
        MercadoPagoService.Resultado pago = mercadoPagoService.pagar(
                token, total, descripcion, primera.getClienteEmail(), "grp-" + reservaIds.get(0));
        if (!pago.pagado)
            throw new RuntimeException(pago.motivo != null ? pago.motivo : "El pago con Yape no se pudo confirmar");

        return confirmarPagoGrupo(reservaIds, pendientes, pago.referencia, METODO_YAPE);
    }

    private List<Venta> cargarGrupo(List<String> reservaIds) {
        if (reservaIds == null || reservaIds.isEmpty())
            throw new RuntimeException("No hay reservas para pagar");
        List<Venta> ventas = new ArrayList<>();
        for (String id : reservaIds)
            ventas.add(ventaRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Reserva no encontrada")));
        return ventas;
    }

    /** Las reservas del grupo que aún faltan pagar (las ya pagadas se devuelven fuera). */
    private List<Venta> grupoPendiente(List<String> reservaIds) {
        List<Venta> pendientes = new ArrayList<>();
        for (String id : cargarGrupo(reservaIds).stream().map(Venta::getId).toList()) {
            Venta v = reservaLista(id);   // null si ya estaba pagada; lanza si expiró
            if (v != null) pendientes.add(v);
        }
        return pendientes;
    }

    /**
     * Cierra el pago de todo el grupo: marca pagadas las pendientes, confirma sus
     * asientos, emite comprobante (si está activado) y envía un boleto por pasajero.
     * Devuelve un boleto por cada reserva del grupo (todas, ya pagadas o recién pagadas).
     */
    /**
     * Confirma el pago cuando lo avisa la notificación IPN de Izipay (no el
     * navegador). Hace lo mismo que el pago normal: marca pagado, confirma el
     * asiento, emite el comprobante y manda el boleto por correo.
     */
    @Transactional
    public void confirmarDesdeIpn(List<Venta> pendientes, String referencia) {
        for (Venta v : pendientes) {
            v.setEstado(Venta.EstadoVenta.PAGADO);
            v.setPasarelaReferencia(referencia);
            v.setMetodoPago(METODO_IZIPAY);   // el IPN solo lo manda Izipay
            v.setReservaExpira(null);
            ventaRepository.save(v);
            asientoService.confirmarAsiento(v.getId());

            emitirComprobanteElectronico(v);
            try {
                ventaService.enviarComprobante(v.getId());
            } catch (Exception e) {
                System.err.println("[IPN] No se pudo enviar el boleto por correo: " + e.getMessage());
            }
        }
    }

    private ConfirmacionGrupoDTO confirmarPagoGrupo(List<String> reservaIds,
                                                    List<Venta> pendientes, String referencia,
                                                    String metodo) {
        Set<String> pendIds = new HashSet<>();
        for (Venta v : pendientes) pendIds.add(v.getId());

        java.util.Map<String, ComprobanteDTO> comprobantes = new java.util.HashMap<>();
        boolean correoOk = true;
        for (Venta v : pendientes) {
            v.setEstado(Venta.EstadoVenta.PAGADO);
            v.setPasarelaReferencia(referencia);
            if (metodo != null) v.setMetodoPago(metodo);
            v.setReservaExpira(null);
            ventaRepository.save(v);
            asientoService.confirmarAsiento(v.getId());

            ComprobanteDTO c = emitirComprobanteElectronico(v);
            if (c != null) comprobantes.put(v.getId(), c);

            try {
                ventaService.enviarComprobante(v.getId());
            } catch (Exception e) {
                correoOk = false;
                System.err.println("[ReservaGrupo] No se pudo enviar el boleto de "
                        + v.getId() + ": " + e.getMessage());
            }
        }

        List<ConfirmacionDTO> boletos = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (String id : reservaIds) {
            Venta v = ventaRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Reserva no encontrada"));
            ConfirmacionDTO dto = confirmacion(v, pendIds.contains(id) && correoOk, null);
            ComprobanteDTO c = comprobantes.get(id);
            if (c != null) {
                dto.setComprobanteElectronico(c.getSerie() + "-" + c.getNumero());
                dto.setEnlacePdf(c.getEnlacePdf());
            }
            boletos.add(dto);
            total = total.add(v.getPrecio());
        }

        ConfirmacionGrupoDTO g = new ConfirmacionGrupoDTO();
        g.setPasajeros(boletos);
        g.setMontoTotal(total);
        g.setCorreoEnviado(correoOk);
        g.setCorreo(boletos.isEmpty() ? null : boletos.get(0).getCorreo());
        g.setMensaje(pendientes.isEmpty() ? "Esta compra ya estaba pagada" : "¡Pago realizado con éxito!");
        return g;
    }

    /**
     * Comprueba que la reserva siga en pie y la devuelve. Null significa que ya estaba
     * pagada, y libera el asiento si el plazo se venció.
     */
    private Venta reservaLista(String reservaId) {
        Venta v = ventaRepository.findById(reservaId)
                .orElseThrow(() -> new RuntimeException("Reserva no encontrada"));

        if (v.getEstado() == Venta.EstadoVenta.PAGADO) return null;

        if (v.getEstado() != Venta.EstadoVenta.RESERVADO)
            throw new RuntimeException("La reserva no está disponible para pago");

        if (v.getReservaExpira() != null && LocalDateTime.now().isAfter(v.getReservaExpira())) {
            v.setEstado(Venta.EstadoVenta.ANULADO);
            v.setAnuladaAt(LocalDateTime.now());
            ventaRepository.save(v);
            asientoService.liberarAsiento(reservaId);
            throw new RuntimeException("La reserva expiró. Vuelve a elegir tu asiento.");
        }
        return v;
    }

    /**
     * Cierra la compra: marca la venta pagada, confirma el asiento, emite el
     * comprobante y manda el boleto. Es común a todos los medios de pago.
     *
     * El cobro ya ocurrió, así que si la emisión o el correo fallan la compra sigue
     * siendo válida: se avisa en la respuesta y el comprobante se puede reintentar
     * desde el sistema, sin volver a cobrar.
     */
    private ConfirmacionDTO confirmarPago(Venta v, String referenciaPasarela, String metodo) {
        v.setEstado(Venta.EstadoVenta.PAGADO);
        v.setPasarelaReferencia(referenciaPasarela);
        // Con qué se pagó en línea. Junto con canal=WEB identifica la pasarela:
        // TARJETA = Izipay, YAPE = Mercado Pago. Sin esto la venta quedaba con
        // método nulo y los reportes la contaban como efectivo de caja.
        if (metodo != null) v.setMetodoPago(metodo);
        v.setReservaExpira(null);
        ventaRepository.save(v);

        asientoService.confirmarAsiento(v.getId());

        ComprobanteDTO comprobante = emitirComprobanteElectronico(v);

        boolean enviado = false;
        try {
            ventaService.enviarComprobante(v.getId());
            enviado = true;
        } catch (Exception e) {
            System.err.println("[Reserva] No se pudo enviar el correo del boleto: " + e.getMessage());
        }

        ConfirmacionDTO dto = confirmacion(v, enviado, "¡Pago realizado con éxito!");
        if (comprobante != null) {
            dto.setComprobanteElectronico(comprobante.getSerie() + "-" + comprobante.getNumero());
            dto.setEnlacePdf(comprobante.getEnlacePdf());
        } else if (esElectronico(v.getTipoComprobante())) {
            dto.setMensaje("¡Pago realizado con éxito! Tu " + v.getTipoComprobante().name().toLowerCase()
                    + " se emitirá en breve y te llegará por correo.");
        }
        return dto;
    }

    /**
     * Emite la boleta o factura en Nubefact usando el mismo camino que el mostrador.
     * Devuelve null si la venta es solo ticket o si la emisión falló.
     */
    private ComprobanteDTO emitirComprobanteElectronico(Venta v) {
        if (!emitirComprobanteWeb) return null;   // apagado en pruebas: solo ticket con QR
        if (!esElectronico(v.getTipoComprobante())) return null;

        boolean factura = v.getTipoComprobante() == Venta.TipoComprobante.FACTURA;

        ComprobanteRequest req = new ComprobanteRequest();
        req.setVentaId(v.getId());
        req.setTipoDeComprobante(factura ? "FACTURA" : "BOLETA");
        req.setClienteEmail(v.getClienteEmail());

        if (factura) {
            req.setClienteTipoDeDocumento("6");                 // 6 = RUC
            req.setClienteNumeroDeDocumento(v.getClienteDocumento());
            req.setClienteDenominacion(v.getClienteNombre());
        } else {
            req.setClienteTipoDeDocumento(codigoSunat(v.getTipoDocumento()));
            req.setClienteNumeroDeDocumento(v.getPasajeroDocumento());
            req.setClienteDenominacion(v.getPasajeroNombre());
        }

        try {
            // En transacción aparte: si falla, no revierte el pago ya cobrado.
            return comprobanteService.generarAislado(req, "Venta web");
        } catch (Exception e) {
            System.err.println("[Reserva] No se pudo emitir el comprobante de la venta "
                    + v.getId() + ": " + e.getMessage());
            return null;
        }
    }

    /** Mismas reglas que aplica SUNAT al emitir, comprobadas antes de cobrar. */
    private void validarDatosDelComprobante(ReservaRequest req) {
        Venta.TipoComprobante tipo = parseComprobante(req.getTipoComprobante());

        if (tipo == Venta.TipoComprobante.FACTURA) {
            String ruc = req.getClienteDocumento() != null ? req.getClienteDocumento().trim() : "";
            if (!ruc.matches("\\d{11}"))
                throw new RuntimeException("Para una factura necesitas un RUC de 11 dígitos");
            if (vacio(req.getClienteNombre()))
                throw new RuntimeException("Para una factura necesitas la razón social de la empresa");
        } else if (tipo == Venta.TipoComprobante.BOLETA) {
            String doc = req.getPasajeroDocumento() != null ? req.getPasajeroDocumento().trim() : "";
            if ("DNI".equalsIgnoreCase(req.getTipoDocumento()) && !doc.matches("\\d{8}"))
                throw new RuntimeException("Para una boleta el DNI debe tener 8 dígitos");
        }
    }

    private boolean esElectronico(Venta.TipoComprobante t) {
        return t == Venta.TipoComprobante.BOLETA || t == Venta.TipoComprobante.FACTURA;
    }

    /** Código de documento según SUNAT: 1=DNI, 4=CE, 6=RUC, 7=Pasaporte. */
    private String codigoSunat(Venta.TipoDocumento t) {
        if (t == null) return "1";
        switch (t) {
            case CE:         return "4";
            case RUC:        return "6";
            case PASAPORTE:  return "7";
            default:         return "1";
        }
    }

    private ConfirmacionDTO confirmacion(Venta v, boolean correoEnviado, String mensaje) {
        ConfirmacionDTO dto = new ConfirmacionDTO();
        dto.setVentaId(v.getId());
        dto.setEstado(v.getEstado().name());
        dto.setComprobante(v.getSerieComprobante() + "-" + v.getNumeroComprobante());
        dto.setCodigoQr(v.getCodigoQr());
        dto.setPasajeroNombre(v.getPasajeroNombre());
        dto.setRuta(safe(v.getParadaOrigen()) + " → " + safe(v.getParadaDestino()));
        dto.setAsiento((v.getAsientoTipo() != null ? v.getAsientoTipo().name() : "") + " #" + v.getAsientoNumero());
        dto.setPrecio(v.getPrecio());
        dto.setCorreoEnviado(correoEnviado);
        dto.setCorreo(v.getClienteEmail());
        dto.setMensaje(mensaje);
        if (v.getViajeId() != null) {
            viajeRepository.findById(v.getViajeId()).ifPresent(viaje -> {
                dto.setFechaSalida(viaje.getFechaSalida() != null ? viaje.getFechaSalida().toString() : null);
                dto.setHoraSalida(viaje.getHoraSalida() != null ? viaje.getHoraSalida().toString() : null);
            });
        }
        return dto;
    }

    private BigDecimal calcularPrecio(Viaje viaje, int ordenOrigen, int ordenDestino, boolean vip) {
        BigDecimal regular = precioRegular(viaje, ordenOrigen, ordenDestino, vip);

        java.util.Optional<Ruta> oferta = publicService.ofertaActivaDeRuta(
                viaje.getRutaId(), viaje.getFechaSalida());
        if (oferta.isPresent()) {
            BigDecimal precioOferta = vip ? oferta.get().getPrecioVipOferta()
                                          : oferta.get().getPrecioNormalOferta();
            // La oferta es por ruta completa, así que en un tramo corto puede quedar
            // por encima de su tarifa normal. Cobrar de más bajo el rótulo "OFERTA"
            // sería engañar al pasajero: se aplica solo cuando de verdad abarata.
            if (precioOferta != null && (regular == null || precioOferta.compareTo(regular) < 0))
                return precioOferta;
        }
        return regular;
    }

    /** Precio sin oferta: tarifa del tramo si existe, si no la del viaje. */
    private BigDecimal precioRegular(Viaje viaje, int ordenOrigen, int ordenDestino, boolean vip) {
        if (viaje.getRutaId() != null) {
            for (RutaTarifaTramo t : tarifaRepository.findByRutaId(viaje.getRutaId())) {
                if (t.getOrdenOrigen() != null && t.getOrdenDestino() != null
                        && t.getOrdenOrigen() == ordenOrigen && t.getOrdenDestino() == ordenDestino) {
                    return vip ? t.getPrecioVip() : t.getPrecioNormal();
                }
            }
        }
        return vip ? viaje.getPrecioVip() : viaje.getPrecioNormal();
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

    private String generarNumeroComprobante() {
        long siguiente = ventaRepository.findTopByOrderByNumeroComprobanteDesc()
                .map(v -> {
                    try { return Long.parseLong(v.getNumeroComprobante()) + 1; }
                    catch (NumberFormatException e) { return ventaRepository.count() + 1; }
                })
                .orElse(1L);
        return String.format("%08d", siguiente);
    }

    private Venta.TipoDocumento parseTipoDoc(String s) {
        try { return Venta.TipoDocumento.valueOf(s); }
        catch (Exception e) { return Venta.TipoDocumento.DNI; }
    }

    private Venta.TipoComprobante parseComprobante(String s) {
        try { return Venta.TipoComprobante.valueOf(s); }
        catch (Exception e) { return Venta.TipoComprobante.BOLETA; }
    }

    private boolean vacio(String s) { return s == null || s.trim().isEmpty(); }
    private String safe(String s) { return s == null ? "" : s; }
}
