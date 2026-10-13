package com.example.demo.service;

import com.example.demo.model.Cliente;
import com.example.demo.model.VerificacionCelular;
import com.example.demo.model.VerificacionCelular.Canal;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.repository.VerificacionCelularRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Comprobar que el celular de la cuenta es de quien dice.
 *
 * <p><strong>Un código de seis dígitos no se protege con que venza.</strong> Hay
 * un millón de combinaciones y probar es gratis: lo que lo protege es contar los
 * intentos. A los cinco fallos el código muere y hay que pedir otro. Esa es la
 * diferencia con la verificación del correo, donde el token son 32 bytes de azar
 * y adivinarlo no es una posibilidad.
 *
 * <p>Del código se guarda el hash, nunca el código. Vive diez minutos: es algo
 * que la persona tiene en la mano y copia en el momento.
 *
 * <p><strong>Hoy no hay por dónde mandarlo.</strong> Ni SMS ni WhatsApp están
 * integrados, así que esto queda apagado y la pantalla dice que todavía no se
 * puede en vez de ofrecer un botón que no va a funcionar. En modo simulado
 * —desarrollo— el código se escribe en la consola para poder probar el camino
 * completo.
 */
@Service
public class VerificacionCelularService {

    private static final int VALIDEZ_MINUTOS = 10;
    private static final int ESPERA_ENTRE_ENVIOS_MINUTOS = 2;

    private final ClienteRepository clientes;
    private final VerificacionCelularRepository repositorio;
    private final SecureRandom aleatorio = new SecureRandom();

    @Value("${notificaciones.sms.enabled:false}")
    private boolean smsDisponible;

    @Value("${notificaciones.whatsapp.enabled:false}")
    private boolean whatsappDisponible;

    /**
     * Permite probar el camino completo sin canal, escribiendo el código en la
     * consola. Nunca se enciende en producción: sería repartir códigos en el log.
     */
    @Value("${verificacion.celular.simulado:false}")
    private boolean simulado;

    public VerificacionCelularService(ClienteRepository clientes,
                                      VerificacionCelularRepository repositorio) {
        this.clientes = clientes;
        this.repositorio = repositorio;
    }

    /** ¿Se puede ofrecer verificar el celular? Si no hay canal, no. */
    public boolean hayPorDondeMandar() {
        return smsDisponible || whatsappDisponible || simulado;
    }

    /** El canal que se va a usar: WhatsApp primero, que es más barato acá. */
    public Canal canalElegido() {
        return whatsappDisponible ? Canal.WHATSAPP : Canal.SMS;
    }

    /**
     * Manda el código al celular que el cliente tiene en su perfil.
     *
     * @return a qué número se mandó, tapado salvo los últimos dígitos: confirma
     *         que es el suyo sin repetirlo entero en una pantalla.
     */
    @Transactional
    public String enviarCodigo(String email) {
        Cliente c = buscar(email);

        if (!hayPorDondeMandar())
            throw new RuntimeException(
                    "Todavía no podemos mandar mensajes al celular. Lo vamos a habilitar pronto.");
        if (c.tieneCelularVerificado())
            throw new RuntimeException("Tu celular ya está verificado");
        if (c.getTelefono() == null || c.getTelefono().isBlank())
            throw new RuntimeException("Primero escribe tu número en tus datos");

        if (repositorio.pedidoReciente(c.getId(),
                LocalDateTime.now().minusMinutes(ESPERA_ENTRE_ENVIOS_MINUTOS)))
            throw new RuntimeException("Te mandamos un código hace menos de "
                    + ESPERA_ENTRE_ENVIOS_MINUTOS + " minutos. Revisa tus mensajes.");

        repositorio.invalidarAnteriores(c.getId(), LocalDateTime.now());

        String codigo = generarCodigo();
        VerificacionCelular v = new VerificacionCelular();
        v.setId(UUID.randomUUID().toString());
        v.setCodigoHash(hashear(codigo));
        v.setClienteId(c.getId());
        v.setTelefono(c.celularCompleto());
        v.setCanal(canalElegido());
        v.setCreatedAt(LocalDateTime.now());
        v.setExpiraAt(LocalDateTime.now().plusMinutes(VALIDEZ_MINUTOS));
        repositorio.save(v);

        if (simulado) {
            System.out.println("[Verificación celular] MODO SIMULACIÓN — código para "
                    + c.celularCompleto() + ": " + codigo);
        } else {
            // Acá va el envío real cuando se contrate el canal. Es el único
            // lugar que hay que tocar.
            throw new UnsupportedOperationException(
                    "PENDIENTE PROVEEDOR: falta conectar " + canalElegido()
                    + " para mandar el código. Ver notificaciones.sms.enabled / "
                    + "notificaciones.whatsapp.enabled.");
        }

        return tapar(c.celularCompleto());
    }

    /**
     * Comprueba el código.
     *
     * <p>Cada fallo suma, y a los cinco el código deja de servir aunque sea el
     * correcto: si no, seis dígitos se prueban enteros en una tarde.
     *
     * <p><strong>Este método NO lleva @Transactional, y es a propósito.</strong>
     * Con una transacción alrededor, cada intento fallido guardaba el contador y
     * acto seguido lanzaba la excepción del error — que marca la transacción
     * para deshacerse. El contador volvía a cero con ella: la cuenta de intentos
     * nunca subía y probar el millón de códigos salía gratis.
     *
     * <p>Sin transacción, cada save() se confirma solo y el fallo queda contado
     * aunque después se avise del error. En el camino bueno se marca primero el
     * código como usado y después el cliente como verificado: si lo segundo
     * falla, el peor caso es que tenga que pedir otro código.
     */
    public void confirmar(String email, String codigo) {
        Cliente c = buscar(email);

        VerificacionCelular v = repositorio
                .findFirstByClienteIdAndUsadoAtIsNullOrderByCreatedAtDesc(c.getId())
                .orElseThrow(() -> new RuntimeException(
                        "No tienes un código pendiente. Pide uno nuevo."));

        if (!v.estaVigente(LocalDateTime.now()))
            throw new RuntimeException("Ese código ya venció o se usó. Pide uno nuevo.");

        // Si cambió de número después de pedir el código, este ya no comprueba
        // nada: se verificó un teléfono, no una persona.
        if (!v.getTelefono().equals(c.celularCompleto())) {
            v.setUsadoAt(LocalDateTime.now());
            repositorio.save(v);
            throw new RuntimeException("Cambiaste de número. Pide un código nuevo.");
        }

        String limpio = codigo == null ? "" : codigo.trim();
        if (!hashear(limpio).equals(v.getCodigoHash())) {
            v.setIntentos(v.getIntentos() + 1);
            repositorio.save(v);
            int quedan = v.intentosQueQuedan();
            throw new RuntimeException(quedan > 0
                    ? "Ese código no es. Te quedan " + quedan + " intento(s)."
                    : "Demasiados intentos. Pide un código nuevo.");
        }

        // Primero se quema el código y después se marca al cliente: si lo
        // segundo fallara, el código ya no sirve y pide uno nuevo. Al revés,
        // un código vivo quedaría dando vueltas.
        v.setUsadoAt(LocalDateTime.now());
        repositorio.save(v);

        c.setTelefonoVerificadoAt(LocalDateTime.now());
        clientes.save(c);
    }

    private Cliente buscar(String email) {
        return clientes.findByEmail(email == null ? "" : email.trim().toLowerCase())
                .orElseThrow(() -> new RuntimeException("Cuenta no encontrada"));
    }

    /** Seis dígitos, con ceros a la izquierda si toca. */
    private String generarCodigo() {
        return String.format("%06d", aleatorio.nextInt(1_000_000));
    }

    /** "+51965123456" → "+51 ··· ··· 456". */
    static String tapar(String telefono) {
        if (telefono == null || telefono.length() < 4) return "tu número";
        String fin = telefono.substring(telefono.length() - 3);
        String cod = telefono.startsWith("+") ? telefono.substring(0, 3) : "";
        return cod + " ··· ··· " + fin;
    }

    static String hashear(String valor) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] h = md.digest(valor.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(h.length * 2);
            for (byte b : h) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo procesar el código", e);
        }
    }
}
