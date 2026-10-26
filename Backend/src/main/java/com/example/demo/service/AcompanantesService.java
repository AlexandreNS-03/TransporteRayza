package com.example.demo.service;

import com.example.demo.dto.AcompananteDTO;
import com.example.demo.model.AcompananteFrecuente;
import com.example.demo.model.Cliente;
import com.example.demo.repository.AcompananteFrecuenteRepository;
import com.example.demo.repository.ClienteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * La gente con la que el cliente suele viajar.
 *
 * <p>Quien compra para su familia escribe cinco veces los mismos nombres y
 * documentos, cada vez. Esto lo guarda una vez.
 *
 * <p><strong>Son datos de terceros, y eso cambia cómo se tratan.</strong> El
 * que los carga es el titular de la cuenta; el acompañante no dio permiso ni se
 * enteró. Por eso se guarda solo lo que ya se escribe al comprar —nombre,
 * documento, nacimiento, sexo y un teléfono— y nada que sirva para contactarlo
 * por nuestra cuenta. No se usan para nada más que llenar el formulario de
 * compra, y el titular los puede borrar cuando quiera.
 */
@Service
public class AcompanantesService {

    /** Suficiente para una familia grande, y acota lo que guardamos de terceros. */
    public static final int MAXIMO_POR_CLIENTE = 10;

    private static final Set<String> TIPOS = Set.of("DNI", "CE", "PASAPORTE", "CPF");
    private static final Set<String> SEXOS = Set.of("Masculino", "Femenino", "Otro");

    private final AcompananteFrecuenteRepository repositorio;
    private final ClienteRepository clientes;

    public AcompanantesService(AcompananteFrecuenteRepository repositorio, ClienteRepository clientes) {
        this.repositorio = repositorio;
        this.clientes = clientes;
    }

    public List<AcompananteDTO> deCliente(String email) {
        Cliente c = buscar(email);
        LocalDate hoy = LocalDate.now();
        return repositorio.findByClienteIdOrderByNombreCompletoAsc(c.getId()).stream()
                .map(a -> toDTO(a, hoy))
                .toList();
    }

    /**
     * Agrega uno, o actualiza el que ya estaba.
     *
     * La misma persona se reconoce por tipo y número de documento: si el
     * cliente la vuelve a cargar porque corrigió el nombre, se actualiza en vez
     * de aparecer dos veces en la lista.
     */
    @Transactional
    public AcompananteDTO guardar(String email, AcompananteDTO datos) {
        Cliente c = buscar(email);

        String nombre = limpiar(datos.getNombreCompleto());
        if (nombre.isBlank())
            throw new RuntimeException("Escribe el nombre completo");
        if (nombre.length() > 150)
            throw new RuntimeException("Ese nombre es demasiado largo");

        String tipo = limpiar(datos.getTipoDocumento()).toUpperCase();
        if (!TIPOS.contains(tipo))
            throw new RuntimeException("Elige el tipo de documento");

        String numero = limpiar(datos.getNumeroDocumento()).toUpperCase();
        if (numero.isBlank())
            throw new RuntimeException("Escribe el número de documento");
        if (numero.length() > 30)
            throw new RuntimeException("Ese número es demasiado largo");

        LocalDate nacimiento = parseFecha(datos.getFechaNacimiento());
        if (nacimiento != null && nacimiento.isAfter(LocalDate.now()))
            throw new RuntimeException("La fecha de nacimiento no puede ser futura");

        AcompananteFrecuente a = repositorio
                .findByClienteIdAndTipoDocumentoAndNumeroDocumento(c.getId(), tipo, numero)
                .orElse(null);

        if (a == null) {
            if (repositorio.countByClienteId(c.getId()) >= MAXIMO_POR_CLIENTE)
                throw new RuntimeException("Ya tienes " + MAXIMO_POR_CLIENTE
                        + " acompañantes guardados. Borra uno para agregar otro.");
            a = new AcompananteFrecuente();
            a.setId(UUID.randomUUID().toString());
            a.setClienteId(c.getId());
            a.setTipoDocumento(tipo);
            a.setNumeroDocumento(numero);
            a.setCreatedAt(LocalDateTime.now());
        }

        a.setNombreCompleto(nombre);

        // Lo que no viene en el pedido NO se toca.
        //
        // Guardar de nuevo a la misma persona —porque se corrigió el nombre—
        // llegaba sin fecha de nacimiento ni sexo, y los borraba. La pantalla
        // manda todo, así que no se notaba desde ahí; se notó llamando a la API
        // a mano. Perder un dato en silencio es peor que no actualizarlo: la
        // edad va al manifiesto.
        //
        // Para vaciar un campo a propósito se manda vacío, que es distinto de
        // no mandarlo.
        if (datos.getFechaNacimiento() != null) a.setFechaNacimiento(nacimiento);
        if (datos.getSexo() != null) {
            String sexo = limpiar(datos.getSexo());
            a.setSexo(SEXOS.contains(sexo) ? sexo : null);
        }
        if (datos.getTelefono() != null) {
            String tel = limpiar(datos.getTelefono());
            a.setTelefono(tel.isBlank() ? null : tel);
        }

        a.setUpdatedAt(LocalDateTime.now());
        repositorio.save(a);

        return toDTO(a, LocalDate.now());
    }

    /** Lo saca de la lista. Son datos de otra persona: se borran sin preguntar. */
    @Transactional
    public void borrar(String email, String id) {
        Cliente c = buscar(email);
        AcompananteFrecuente a = repositorio.findByIdAndClienteId(id, c.getId())
                .orElseThrow(() -> new RuntimeException("Ese acompañante no está en tu lista"));
        repositorio.delete(a);
    }

    private Cliente buscar(String email) {
        return clientes.findByEmail(email == null ? "" : email.trim().toLowerCase())
                .orElseThrow(() -> new RuntimeException("Cuenta no encontrada"));
    }

    private static AcompananteDTO toDTO(AcompananteFrecuente a, LocalDate hoy) {
        AcompananteDTO dto = new AcompananteDTO();
        dto.setId(a.getId());
        dto.setNombreCompleto(a.getNombreCompleto());
        dto.setTipoDocumento(a.getTipoDocumento());
        dto.setNumeroDocumento(a.getNumeroDocumento());
        dto.setFechaNacimiento(a.getFechaNacimiento() != null ? a.getFechaNacimiento().toString() : null);
        dto.setEdad(a.edadAl(hoy));
        dto.setSexo(a.getSexo());
        dto.setTelefono(a.getTelefono());
        return dto;
    }

    private static String limpiar(String v) { return v == null ? "" : v.trim(); }

    private static LocalDate parseFecha(String valor) {
        if (valor == null || valor.isBlank()) return null;
        try { return LocalDate.parse(valor.trim()); }
        catch (DateTimeParseException e) { throw new RuntimeException("Revisa la fecha de nacimiento"); }
    }
}
