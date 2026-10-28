package com.example.demo.service;

import com.example.demo.dto.ClienteAuthResponse;
import com.example.demo.dto.ClienteComprobanteDTO;
import com.example.demo.dto.ClienteDTO;
import com.example.demo.dto.ClienteRegisterRequest;
import com.example.demo.dto.ClienteViajeDTO;
import com.example.demo.model.Cliente;
import com.example.demo.model.Comprobante;
import com.example.demo.model.Venta;
import com.example.demo.model.Viaje;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.repository.ComprobanteRepository;
import com.example.demo.repository.VentaRepository;
import com.example.demo.repository.ViajeRepository;
import com.example.demo.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final VentaRepository ventaRepository;
    private final ComprobanteRepository comprobanteRepository;
    private final ViajeRepository viajeRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final IntentosLoginService intentosLoginService;
    private final VerificacionEmailService verificacionEmailService;
    private final VerificacionCelularService verificacionCelularService;
    private final EmailService emailService;

    /** Mínimo de la contraseña. Seis caracteres se adivinan; ocho ya no tanto. */
    /** @deprecated usa {@link Claves#MINIMO}. Queda porque la pantalla lo muestra. */
    public static final int MINIMO_CLAVE = Claves.MINIMO;

    /**
     * Un hash de descarte, contra el que se compara cuando el correo no tiene
     * cuenta. Sin esto, responder "no existe" sale muchísimo más rápido que
     * comprobar una contraseña de verdad, y esa diferencia de tiempo basta para
     * averiguar quién está registrado sin acertar ni una clave.
     *
     * Tiene que ser un hash de verdad y del mismo costo que los demás: uno
     * inventado se descarta al instante por mal formado y no hace ningún
     * trabajo, que es justo lo que se quería evitar. Por eso se genera al
     * arrancar, cifrando algo que nadie va a escribir nunca.
     */
    private final String hashDeDescarte;

    public ClienteService(ClienteRepository clienteRepository,
                          VentaRepository ventaRepository,
                          ComprobanteRepository comprobanteRepository,
                          ViajeRepository viajeRepository,
                          PasswordEncoder passwordEncoder,
                          JwtUtil jwtUtil,
                          IntentosLoginService intentosLoginService,
                          VerificacionEmailService verificacionEmailService,
                          VerificacionCelularService verificacionCelularService,
                          EmailService emailService) {
        this.clienteRepository = clienteRepository;
        this.ventaRepository = ventaRepository;
        this.comprobanteRepository = comprobanteRepository;
        this.viajeRepository = viajeRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.intentosLoginService = intentosLoginService;
        this.verificacionEmailService = verificacionEmailService;
        this.verificacionCelularService = verificacionCelularService;
        this.emailService = emailService;
        this.hashDeDescarte = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    @Transactional
    public ClienteAuthResponse registrar(ClienteRegisterRequest req) {
        String email = normalizarEmail(req.getEmail());
        if (email.isBlank()) throw new RuntimeException("El correo es obligatorio");
        validarClave(req.getPassword());
        if (clienteRepository.existsByEmail(email))
            throw new RuntimeException("Ya existe una cuenta con ese correo");

        Cliente c = new Cliente();
        c.setId(UUID.randomUUID().toString());
        c.setEmail(email);
        c.setPassword(passwordEncoder.encode(req.getPassword()));
        c.setNombres(req.getNombres());
        c.setApellidos(req.getApellidos());
        c.setTipoDocumento(parseTipoDoc(req.getTipoDocumento()));
        c.setNumeroDocumento(req.getNumeroDocumento());
        c.setPaisDocumento(req.getPaisDocumento() != null ? req.getPaisDocumento() : "PE");
        c.setFechaNacimiento(parseFecha(req.getFechaNacimiento()));
        c.setCodigoPaisTelefono(req.getCodigoPaisTelefono() != null ? req.getCodigoPaisTelefono() : "+51");
        c.setTelefono(req.getTelefono());
        c.setGenero(parseGenero(req.getGenero()));
        c.setNacionalidad(normalizarPais(req.getNacionalidad()));
        c.setActivo(true);
        c.setCreatedAt(LocalDateTime.now());
        clienteRepository.save(c);

        // El enlace sale apenas se crea la cuenta: cuanto antes se confirme,
        // antes sabemos que el boleto va a llegar a donde tiene que llegar.
        verificacionEmailService.enviarEnlace(c);

        return construirRespuesta(c);
    }

    /**
     * Entra a la cuenta.
     *
     * Tres cosas valen la pena acá, y las tres son para que nadie pueda ir
     * probando:
     *
     *  - El mismo freno que el panel (cinco fallos y bloqueo creciente), por
     *    correo y por dirección de internet a la vez. Antes el cliente no lo
     *    tenía: se podían probar contraseñas sin límite.
     *  - El mensaje es el mismo falle lo que falle. Decir "la cuenta está
     *    desactivada" ya confirma que ese correo está registrado.
     *  - Se comprueba una contraseña siempre, exista o no la cuenta, para que
     *    responder no tarde distinto según el caso.
     */
    @Transactional
    public ClienteAuthResponse login(String email, String password, String ip) {
        String limpio = normalizarEmail(email);
        intentosLoginService.verificarPublico(limpio, ip);

        Cliente c = clienteRepository.findByEmail(limpio).orElse(null);
        boolean claveOk = passwordEncoder.matches(
                password == null ? "" : password,
                c != null ? c.getPassword() : hashDeDescarte);

        if (c == null || !claveOk || Boolean.FALSE.equals(c.getActivo())) {
            intentosLoginService.registrarFalloPublico(limpio, ip);
            throw new RuntimeException("Correo o contraseña incorrectos");
        }

        intentosLoginService.registrarExitoPublico(limpio, ip);
        c.setUltimoLogin(LocalDateTime.now());
        clienteRepository.save(c);
        return construirRespuesta(c);
    }

    /**
     * Cambia la contraseña desde adentro de la cuenta, y devuelve un token nuevo.
     *
     * <p>Pide la actual aunque ya esté la sesión abierta: si alguien se sienta
     * en la computadora con la sesión puesta, que no pueda quedarse con la
     * cuenta. Y se avisa por correo, porque un cambio que el dueño no hizo tiene
     * que enterarse en el momento.
     *
     * <p>El token nuevo no es un lujo: al cambiar la clave se cortan todas las
     * sesiones de la cuenta, y sin esto el navegador que acaba de hacer el
     * cambio se quedaría afuera de inmediato —el usuario vería "iniciá sesión"
     * justo después de escribir su contraseña nueva dos veces—.
     */
    @Transactional
    public String cambiarClave(String email, String actual, String nueva) {
        Cliente c = obtenerPorEmail(email);
        if (!passwordEncoder.matches(actual == null ? "" : actual, c.getPassword()))
            throw new RuntimeException("Tu contraseña actual no es correcta");
        validarClave(nueva);
        if (passwordEncoder.matches(nueva, c.getPassword()))
            throw new RuntimeException("La contraseña nueva tiene que ser distinta de la actual");

        c.setPassword(passwordEncoder.encode(nueva));
        // Cambiar la contraseña echa a quien estuviera adentro con la vieja:
        // es justo el caso para el que uno la cambia. El navegador que hace el
        // cambio recibe un token nuevo, así que no se cae su propia sesión.
        c.setSesionesDesde(java.time.LocalDateTime.now());
        clienteRepository.save(c);

        try {
            emailService.enviarAvisoClaveCambiada(c.getEmail(), c.getNombres());
        } catch (Exception e) {
            // El aviso es importante pero no puede dejar al cliente sin cambiar
            // la contraseña si el correo está caído.
            System.err.println("[Cuenta] no se pudo avisar el cambio de clave: " + e.getMessage());
        }

        return jwtUtil.generateToken(c.getEmail(), "CLIENTE");
    }

    private static Cliente.Genero parseGenero(String valor) {
        if (valor == null || valor.isBlank()) return null;
        try { return Cliente.Genero.valueOf(valor.trim().toUpperCase()); }
        catch (IllegalArgumentException e) { return null; }
    }

    /** ISO-2 en mayúsculas; cualquier otra cosa se descarta en vez de guardarse mal. */
    private static String normalizarPais(String valor) {
        if (valor == null || valor.isBlank()) return null;
        String v = valor.trim().toUpperCase();
        return v.length() == 2 ? v : null;
    }

    /** Las reglas de la contraseña viven en {@link Claves}, para todas las cuentas. */
    public static void validarClave(String clave) {
        Claves.validar(clave);
    }

    public Cliente obtenerPorEmail(String email) {
        return clienteRepository.findByEmail(normalizarEmail(email))
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));
    }

    public ClienteDTO perfil(String email) {
        return toDTO(conCodigoDePasajero(obtenerPorEmail(email)));
    }

    /**
     * Le asigna el código de pasajero frecuente si todavía no tiene.
     *
     * <p>Se hace al entrar a la cuenta y no al registrarse para que también lo
     * tengan las cuentas que ya existían: la alternativa era una migración que
     * recorriera la tabla, y esto se resuelve solo la primera vez que cada uno
     * entra.
     *
     * <p>Si el código sorteado ya existe —cosa improbable con 31 letras y seis
     * posiciones, pero la base lo impide igual— se intenta de nuevo. Y si aun
     * así falla, se devuelve el cliente sin código antes que dejarlo sin ver su
     * cuenta: la credencial es una comodidad, no un requisito.
     */
    /* Sin @Transactional: lo llama perfil() desde esta misma clase y una llamada
       interna no pasa por la envoltura de Spring, así que la anotación no haría
       nada. No hace falta: saveAndFlush abre la suya. */
    private Cliente conCodigoDePasajero(Cliente c) {
        if (c.getCodigoPasajero() != null && !c.getCodigoPasajero().isBlank()) return c;

        for (int intento = 0; intento < 5; intento++) {
            c.setCodigoPasajero(CodigoPasajero.nuevo());
            try {
                return clienteRepository.saveAndFlush(c);
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                c.setCodigoPasajero(null);   // sorteado repetido: otra vuelta
            }
        }
        return c;
    }

    @Transactional
    public ClienteDTO actualizarPerfil(String email, ClienteDTO datos) {
        Cliente c = obtenerPorEmail(email);
        if (datos.getNombres() != null) c.setNombres(datos.getNombres());
        if (datos.getApellidos() != null) c.setApellidos(datos.getApellidos());
        if (datos.getTipoDocumento() != null) c.setTipoDocumento(parseTipoDoc(datos.getTipoDocumento()));
        if (datos.getNumeroDocumento() != null) c.setNumeroDocumento(datos.getNumeroDocumento());
        if (datos.getPaisDocumento() != null) c.setPaisDocumento(datos.getPaisDocumento());
        if (datos.getFechaNacimiento() != null) c.setFechaNacimiento(parseFecha(datos.getFechaNacimiento()));
        // Si cambia el número, se pierde la verificación: lo que se comprobó
        // fue ese teléfono, no la persona. Dejarlo marcado sería decir que
        // comprobamos algo que no comprobamos.
        if (datos.getCodigoPaisTelefono() != null || datos.getTelefono() != null) {
            String antes = c.celularCompleto();
            if (datos.getCodigoPaisTelefono() != null) c.setCodigoPaisTelefono(datos.getCodigoPaisTelefono());
            if (datos.getTelefono() != null) c.setTelefono(datos.getTelefono());
            if (!antes.equals(c.celularCompleto())) c.setTelefonoVerificadoAt(null);
        }
        if (datos.getGenero() != null) c.setGenero(parseGenero(datos.getGenero()));
        if (datos.getNacionalidad() != null) c.setNacionalidad(normalizarPais(datos.getNacionalidad()));
        if (datos.getEmergenciaNombres() != null)    c.setEmergenciaNombres(datos.getEmergenciaNombres());
        if (datos.getEmergenciaApellidos() != null)  c.setEmergenciaApellidos(datos.getEmergenciaApellidos());
        if (datos.getEmergenciaRelacion() != null)   c.setEmergenciaRelacion(datos.getEmergenciaRelacion());
        if (datos.getEmergenciaCodigoPais() != null) c.setEmergenciaCodigoPais(datos.getEmergenciaCodigoPais());
        if (datos.getEmergenciaTelefono() != null)   c.setEmergenciaTelefono(datos.getEmergenciaTelefono());
        clienteRepository.save(c);
        return toDTO(c);
    }

    /**
     * Las compras del cliente, juntadas por CUENTA, por CORREO y por DOCUMENTO.
     *
     * Los tres caminos hacen falta: alguien pudo comprar como invitado antes de
     * crearse la cuenta, o en el mostrador con su DNI y sin dar correo. Si solo
     * se mirara la cuenta, esas compras no aparecerían nunca.
     */
    private java.util.Collection<Venta> comprasDe(Cliente c) {
        return comprasDe(c, true);
    }

    /**
     * @param incluirPorDocumento si además se buscan las compras que llevan su
     *        número de documento. Hace falta para los viajes —así aparecen las
     *        que hizo en el mostrador, sin cuenta— pero NO para los
     *        comprobantes: ver misComprobantes.
     */
    private java.util.Collection<Venta> comprasDe(Cliente c, boolean incluirPorDocumento) {
        java.util.LinkedHashMap<String, Venta> unicas = new java.util.LinkedHashMap<>();
        ventaRepository.findByClienteIdOrderByCreatedAtDesc(c.getId())
                .forEach(v -> unicas.putIfAbsent(v.getId(), v));
        if (c.getEmail() != null && !c.getEmail().isBlank())
            ventaRepository.findByClienteEmailIgnoreCaseOrderByCreatedAtDesc(c.getEmail().trim())
                    .forEach(v -> unicas.putIfAbsent(v.getId(), v));
        if (incluirPorDocumento && c.getNumeroDocumento() != null && !c.getNumeroDocumento().isBlank())
            ventaRepository.findByPasajeroDocumento(c.getNumeroDocumento().trim())
                    .forEach(v -> unicas.putIfAbsent(v.getId(), v));
        return unicas.values();
    }

    public List<ClienteViajeDTO> misViajes(String email) {
        Cliente c = obtenerPorEmail(email);
        LocalDate hoy = LocalDate.now();

        return comprasDe(c).stream()
                .filter(v -> v.getEstado() == Venta.EstadoVenta.PAGADO)
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(v -> toViajeDTO(v, hoy))
                .collect(Collectors.toList());
    }

    /**
     * Las boletas y facturas del cliente, para que se las pueda bajar él mismo.
     *
     * Se llega a ellas desde sus propias compras, que es el mismo camino que ya
     * se usa para mostrarle sus viajes: así un comprobante solo aparece si la
     * venta que lo originó es suya. Buscar por el correo del comprobante sería
     * más corto y más frágil — el comprobante puede llevar el correo de otro, o
     * ninguno.
     *
     * Una compra de varios pasajes lleva un comprobante único para el grupo, así
     * que se buscan los dos caminos y se quita el repetido.
     *
     * <p><strong>A diferencia de los viajes, acá NO se busca por número de
     * documento.</strong> Al registrarse nadie comprueba que el DNI que escribe
     * sea el suyo, así que buscar por documento dejaría que alguien escriba el
     * DNI de otro y se baje sus comprobantes — y un comprobante lleva el nombre
     * completo, el documento y el domicilio del comprador. Un viaje muestra
     * ruta, fecha y asiento; un comprobante muestra a la persona.
     *
     * <p>El costo de esta decisión: quien compró en el mostrador sin dar su
     * correo no ve ahí su boleta y tiene que pedirla en la oficina, como hasta
     * ahora. Es el error barato. El caro es el otro.
     */
    public List<ClienteComprobanteDTO> misComprobantes(String email) {
        Cliente c = obtenerPorEmail(email);

        java.util.LinkedHashMap<String, Comprobante> unicos = new java.util.LinkedHashMap<>();
        for (Venta v : comprasDe(c, false)) {
            comprobanteRepository.findByVentaId(v.getId())
                    .forEach(x -> unicos.putIfAbsent(x.getId(), x));
            if (v.getGrupoVentaId() != null && !v.getGrupoVentaId().isBlank())
                comprobanteRepository.findByGrupoVentaId(v.getGrupoVentaId())
                        .forEach(x -> unicos.putIfAbsent(x.getId(), x));
        }

        return unicos.values().stream()
                .sorted((a, b) -> {
                    String fa = a.getFechaDeEmision() == null ? "" : a.getFechaDeEmision().toString();
                    String fb = b.getFechaDeEmision() == null ? "" : b.getFechaDeEmision().toString();
                    return fb.compareTo(fa);
                })
                .map(ClienteService::toComprobanteDTO)
                .collect(Collectors.toList());
    }

    private static ClienteComprobanteDTO toComprobanteDTO(Comprobante x) {
        String crudo = x.getTipoDeComprobante() == null ? "" : x.getTipoDeComprobante().name();
        String tipo = switch (crudo) {
            case "BOLETA"       -> "Boleta";
            case "FACTURA"      -> "Factura";
            case "NOTA_CREDITO" -> "Nota de crédito";
            case "TICKET"       -> "Ticket";
            case "NOTA_VENTA"   -> "Nota de venta";
            default -> crudo;
        };
        String numero = x.getSerie() + "-" + String.format("%08d", x.getNumero() == null ? 0 : x.getNumero());
        return new ClienteComprobanteDTO(
                tipo, numero,
                x.getFechaDeEmision() == null ? null : x.getFechaDeEmision().toString(),
                x.getTotal(), x.getDescripcion(),
                x.getEstado() == null ? null : x.getEstado().name(), x.getEnlacePdf());
    }

    /**
     * Busca boletos sin necesidad de tener cuenta: por correo o por DNI. Pensado para
     * quien compró como invitado. Solo devuelve compras pagadas, ordenadas por fecha.
     */
    public List<ClienteViajeDTO> buscarBoletos(String correo, String documento) {
        LocalDate hoy = LocalDate.now();
        java.util.List<Venta> ventas;
        if (correo != null && !correo.isBlank())
            ventas = ventaRepository.findByClienteEmailIgnoreCaseOrderByCreatedAtDesc(correo.trim());
        else if (documento != null && !documento.isBlank())
            ventas = ventaRepository.findByPasajeroDocumento(documento.trim());
        else
            throw new RuntimeException("Ingresa tu correo o tu documento");

        return ventas.stream()
                .filter(v -> v.getEstado() == Venta.EstadoVenta.PAGADO)
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(v -> toViajeDTO(v, hoy))
                .collect(Collectors.toList());
    }

    private ClienteViajeDTO toViajeDTO(Venta v, LocalDate hoy) {
        ClienteViajeDTO dto = new ClienteViajeDTO();
        dto.setVentaId(v.getId());
        dto.setViajeCodigo(v.getViajeCodigo());
        dto.setRuta((v.getParadaOrigen() != null ? v.getParadaOrigen() : "")
                + " → " + (v.getParadaDestino() != null ? v.getParadaDestino() : ""));
        dto.setAsientoNumero(v.getAsientoNumero());
        dto.setAsientoTipo(v.getAsientoTipo() != null ? v.getAsientoTipo().name() : null);
        dto.setPrecio(v.getPrecio());
        dto.setEstado(v.getEstado() != null ? v.getEstado().name() : null);
        dto.setEmbarqueEstado(v.getEmbarqueEstado() != null ? v.getEmbarqueEstado().name() : null);
        dto.setCodigoQr(v.getCodigoQr());

        Viaje viaje = v.getViajeId() != null ? viajeRepository.findById(v.getViajeId()).orElse(null) : null;
        if (viaje != null) {
            dto.setFechaSalida(viaje.getFechaSalida() != null ? viaje.getFechaSalida().toString() : null);
            dto.setHoraSalida(viaje.getHoraSalida() != null ? viaje.getHoraSalida().toString() : null);
            dto.setProximo(viaje.getFechaSalida() != null && !viaje.getFechaSalida().isBefore(hoy));
        }
        return dto;
    }

    private ClienteAuthResponse construirRespuesta(Cliente c) {
        return new ClienteAuthResponse(jwtUtil.generateToken(c.getEmail(), "CLIENTE"), toDTO(c));
    }

    private ClienteDTO toDTO(Cliente c) {
        ClienteDTO dto = new ClienteDTO();
        dto.setId(c.getId());
        dto.setEmail(c.getEmail());
        dto.setNombres(c.getNombres());
        dto.setApellidos(c.getApellidos());
        dto.setTipoDocumento(c.getTipoDocumento() != null ? c.getTipoDocumento().name() : null);
        dto.setNumeroDocumento(c.getNumeroDocumento());
        dto.setPaisDocumento(c.getPaisDocumento());
        dto.setCodigoPasajero(c.getCodigoPasajero());
        dto.setFechaNacimiento(c.getFechaNacimiento() != null ? c.getFechaNacimiento().toString() : null);
        dto.setCodigoPaisTelefono(c.getCodigoPaisTelefono());
        dto.setTelefono(c.getTelefono());
        dto.setGenero(c.getGenero() != null ? c.getGenero().name() : null);
        dto.setNacionalidad(c.getNacionalidad());
        dto.setCorreoVerificado(c.tieneCorreoVerificado());
        dto.setCelularVerificado(c.tieneCelularVerificado());
        dto.setPuedeVerificarCelular(verificacionCelularService.hayPorDondeMandar());
        dto.setEmergenciaNombres(c.getEmergenciaNombres());
        dto.setEmergenciaApellidos(c.getEmergenciaApellidos());
        dto.setEmergenciaRelacion(c.getEmergenciaRelacion());
        dto.setEmergenciaCodigoPais(c.getEmergenciaCodigoPais());
        dto.setEmergenciaTelefono(c.getEmergenciaTelefono());
        return dto;
    }

    private String normalizarEmail(String email) { return email == null ? "" : email.trim().toLowerCase(); }

    private Cliente.TipoDocumento parseTipoDoc(String s) {
        try { return Cliente.TipoDocumento.valueOf(s); }
        catch (Exception e) { return Cliente.TipoDocumento.DNI; }
    }

    private LocalDate parseFecha(String s) {
        if (s == null || s.isBlank()) return null;
        try { return LocalDate.parse(s); } catch (Exception e) { return null; }
    }
}
