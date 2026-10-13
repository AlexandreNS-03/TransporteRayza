package com.example.demo.service;

import com.example.demo.dto.MetodoPagoGuardadoDTO;
import com.example.demo.model.AutorizacionYape;
import com.example.demo.model.TarjetaGuardada;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.repository.TarjetaGuardadaRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Los métodos de pago que el cliente dejó guardados.
 *
 * Tarjetas y Yape viven en tablas distintas a propósito: son contratos con
 * proveedores distintos, se autorizan distinto y se dan de baja distinto. Esta
 * clase es la que los junta para la pantalla, que es el único lugar donde son
 * "lo mismo".
 *
 * <p><strong>Qué se guarda:</strong> un identificador del proveedor y lo justo
 * para reconocer el método (marca y cuatro dígitos). Nunca el número de la
 * tarjeta, el código de seguridad ni el celular completo. El número de la
 * tarjeta no pasa por acá: lo escribe el cliente dentro del formulario de
 * Izipay y Izipay nos devuelve el token.
 *
 * <p><strong>Tope de tarjetas por cliente.</strong> Nadie necesita ocho formas
 * de pagar un pasaje, y sin tope una cuenta robada sirve para ir probando
 * tarjetas ajenas contra nuestro comercio hasta ver cuál pasa.
 */
@Service
public class MetodosPagoGuardadosService {

    /** Cuántas tarjetas puede tener guardadas un cliente a la vez. */
    public static final int MAXIMO_TARJETAS = 5;

    private final TarjetaGuardadaRepository tarjetas;
    private final ClienteRepository clientes;
    private final YapeOnFileService yapeOnFile;
    private final AuditoriaService auditoriaService;

    /**
     * Mientras esté apagado, las tarjetas se listan y se dan de baja, pero no se
     * registran nuevas: registrar una exige el ida y vuelta con Izipay, y
     * guardar un token que no sirve sería prometerle al cliente algo que no se
     * puede cumplir.
     */
    @Value("${izipay.tarjetas-guardadas.enabled:false}")
    private boolean guardarTarjetasActivo;

    public MetodosPagoGuardadosService(TarjetaGuardadaRepository tarjetas,
                                       ClienteRepository clientes,
                                       YapeOnFileService yapeOnFile,
                                       AuditoriaService auditoriaService) {
        this.tarjetas = tarjetas;
        this.clientes = clientes;
        this.yapeOnFile = yapeOnFile;
        this.auditoriaService = auditoriaService;
    }

    public boolean guardarTarjetasActivo() { return guardarTarjetasActivo; }

    /** Todo lo que el cliente tiene guardado, en un solo listado. */
    public List<MetodoPagoGuardadoDTO> deCliente(String clienteEmail) {
        List<MetodoPagoGuardadoDTO> salida = new ArrayList<>();
        LocalDate hoy = LocalDate.now();

        for (TarjetaGuardada t : tarjetasActivasDe(clienteEmail)) {
            salida.add(new MetodoPagoGuardadoDTO(
                    t.getId(), MetodoPagoGuardadoDTO.Tipo.TARJETA, t.etiqueta(),
                    t.getMarca(), t.getUltimos4(), vencimiento(t), t.estaVencida(hoy),
                    Boolean.TRUE.equals(t.getPreferida()), !guardarTarjetasActivo));
        }

        yapeOnFile.autorizacionVigenteDe(clienteEmail).ifPresent(a ->
                salida.add(new MetodoPagoGuardadoDTO(
                        a.getId(), MetodoPagoGuardadoDTO.Tipo.YAPE,
                        "Yape ···· " + (a.getCelularFinal() != null ? a.getCelularFinal() : "????"),
                        "Yape", a.getCelularFinal(), null, false, false,
                        yapeOnFile.esSimulado())));

        return salida;
    }

    public List<TarjetaGuardada> tarjetasActivasDe(String clienteEmail) {
        return tarjetas.findByClienteEmailAndEstadoOrderByPreferidaDescUsadaAtDesc(
                normalizar(clienteEmail), TarjetaGuardada.Estado.ACTIVA);
    }

    /** La que se ofrece primero al pagar, si hay alguna y no está vencida. */
    public Optional<TarjetaGuardada> preferidaDe(String clienteEmail) {
        LocalDate hoy = LocalDate.now();
        return tarjetasActivasDe(clienteEmail).stream()
                .filter(t -> !t.estaVencida(hoy))
                .findFirst();
    }

    /**
     * Guarda la tarjeta que Izipay acaba de registrar al cobrar.
     *
     * Se llama después de un pago aprobado, con lo que vino en la respuesta del
     * proveedor. Si el cliente vuelve a pagar con la misma tarjeta, el token es
     * el mismo y no se duplica: se actualiza y listo.
     */
    @Transactional
    public TarjetaGuardada guardarDesdeIzipay(String clienteEmail, String token, String marca,
                                              String ultimos4, Integer venceMes, Integer venceAnio) {
        if (!guardarTarjetasActivo)
            throw new UnsupportedOperationException(
                    "Guardar tarjetas está apagado. Se enciende con izipay.tarjetas-guardadas.enabled "
                    + "cuando Izipay confirme el registro de tarjetas en la cuenta de comercio.");
        if (token == null || token.isBlank())
            throw new RuntimeException("Izipay no devolvió el identificador de la tarjeta");

        String email = normalizar(clienteEmail);

        // Hace falta el correo confirmado para dejar una tarjeta guardada.
        // Guardar una forma de cobro es lo más delicado que tiene la cuenta, y
        // una cuenta abierta con el correo de otro no debería poder hacerlo.
        // Además, el aviso de cada cobro sale por ese correo: si no llega a su
        // dueño, el cobro queda sin testigo.
        boolean verificado = clientes.findByEmail(email)
                .map(com.example.demo.model.Cliente::tieneCorreoVerificado)
                .orElse(false);
        if (!verificado)
            throw new RuntimeException(
                    "Confirma tu correo antes de guardar una forma de pago. "
                    + "Te mandamos el enlace cuando creaste la cuenta; puedes pedir otro desde tu cuenta.");

        Optional<TarjetaGuardada> yaEsta = tarjetas.findByClienteEmailAndToken(email, token);
        if (yaEsta.isPresent()) {
            TarjetaGuardada t = yaEsta.get();
            t.setEstado(TarjetaGuardada.Estado.ACTIVA);
            t.setRevocadaAt(null);
            t.setMotivoBaja(null);
            t.setUsadaAt(LocalDateTime.now());
            return tarjetas.save(t);
        }

        if (tarjetas.countByClienteEmailAndEstado(email, TarjetaGuardada.Estado.ACTIVA) >= MAXIMO_TARJETAS)
            throw new RuntimeException("Ya tienes " + MAXIMO_TARJETAS
                    + " tarjetas guardadas. Borra una para guardar otra.");

        TarjetaGuardada t = new TarjetaGuardada();
        t.setId(UUID.randomUUID().toString());
        t.setClienteEmail(email);
        t.setToken(token);
        t.setMarca(marca);
        t.setUltimos4(ultimos4);
        t.setVenceMes(venceMes);
        t.setVenceAnio(venceAnio);
        t.setEstado(TarjetaGuardada.Estado.ACTIVA);
        t.setPreferida(tarjetas.countByClienteEmailAndEstado(email, TarjetaGuardada.Estado.ACTIVA) == 0);
        t.setCreatedAt(LocalDateTime.now());
        t.setUsadaAt(LocalDateTime.now());
        tarjetas.save(t);

        auditoriaService.registrar("TARJETA_GUARDADA", "PAGOS", t.getId(),
                "El cliente " + email + " guardó " + t.etiqueta());
        return t;
    }

    /** El cliente elige cuál quiere que se le ofrezca primero. */
    @Transactional
    public void marcarPreferida(String clienteEmail, String tarjetaId) {
        String email = normalizar(clienteEmail);
        TarjetaGuardada elegida = tarjetas.findByIdAndClienteEmail(tarjetaId, email)
                .orElseThrow(() -> new RuntimeException("Esa tarjeta no es tuya"));
        for (TarjetaGuardada t : tarjetasActivasDe(email)) {
            t.setPreferida(t.getId().equals(elegida.getId()));
            tarjetas.save(t);
        }
    }

    /**
     * Da de baja un método guardado.
     *
     * Para la tarjeta, se marca revocada y se deja de usar el token. Para Yape,
     * se revoca la autorización con el proveedor. En los dos casos el cliente
     * tiene que poder sacarlo cuando quiera y sin preguntar por qué: es su
     * dinero.
     */
    @Transactional
    public void quitar(String clienteEmail, MetodoPagoGuardadoDTO.Tipo tipo, String id) {
        String email = normalizar(clienteEmail);

        if (tipo == MetodoPagoGuardadoDTO.Tipo.YAPE) {
            AutorizacionYape a = yapeOnFile.autorizacionVigenteDe(email)
                    .filter(x -> x.getId().equals(id))
                    .orElseThrow(() -> new RuntimeException("Ese Yape no es tuyo"));
            yapeOnFile.revocar(a.getId(), "El cliente lo quitó desde su cuenta");
            return;
        }

        TarjetaGuardada t = tarjetas.findByIdAndClienteEmail(id, email)
                .orElseThrow(() -> new RuntimeException("Esa tarjeta no es tuya"));
        t.setEstado(TarjetaGuardada.Estado.REVOCADA);
        t.setPreferida(false);
        t.setRevocadaAt(LocalDateTime.now());
        t.setMotivoBaja("El cliente la quitó desde su cuenta");
        tarjetas.save(t);

        auditoriaService.registrar("TARJETA_BAJA", "PAGOS", t.getId(),
                "El cliente " + email + " quitó " + t.etiqueta());
    }

    /** Se llama después de cobrar, para poder ordenarlas por uso. */
    @Transactional
    public void marcarUsada(String tarjetaId) {
        tarjetas.findById(tarjetaId).ifPresent(t -> {
            t.setUsadaAt(LocalDateTime.now());
            tarjetas.save(t);
        });
    }

    private static String vencimiento(TarjetaGuardada t) {
        if (t.getVenceMes() == null || t.getVenceAnio() == null) return null;
        return String.format("%02d/%02d", t.getVenceMes(), t.getVenceAnio() % 100);
    }

    private static String normalizar(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
