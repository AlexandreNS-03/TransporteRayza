package com.example.demo.service;

import com.example.demo.dto.DocumentoViajeDTO;
import com.example.demo.model.Cliente;
import com.example.demo.model.DocumentoViaje;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.repository.DocumentoViajeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;

/**
 * Los documentos con los que el cliente puede viajar.
 *
 * <p>Son varios porque la gente de acá los usa así: el que vive en la frontera
 * viaja con DNI a Iquitos y con pasaporte o CPF cuando cruza a Brasil, y el
 * extranjero que se quedó tiene carné y pasaporte.
 *
 * <p>Lo que de verdad resuelve esto no es ahorrar tecleo, es el vencimiento:
 * nadie se acuerda de cuándo caduca su documento hasta que está en el muelle y
 * no puede embarcar.
 */
@Service
public class DocumentosViajeService {

    /** Con cuánta antelación se avisa que un documento está por vencer. */
    public static final int DIAS_DE_AVISO = 90;

    /** Más de esto no le hace falta a nadie, y acota lo que guardamos de cada persona. */
    public static final int MAXIMO_POR_CLIENTE = 6;

    private final DocumentoViajeRepository documentos;
    private final ClienteRepository clientes;

    public DocumentosViajeService(DocumentoViajeRepository documentos, ClienteRepository clientes) {
        this.documentos = documentos;
        this.clientes = clientes;
    }

    public List<DocumentoViajeDTO> deCliente(String email) {
        Cliente c = buscar(email);
        LocalDate hoy = LocalDate.now();
        return documentos.findByClienteIdOrderByTipoAsc(c.getId()).stream()
                .map(d -> toDTO(d, hoy))
                .toList();
    }

    /**
     * Agrega uno, o actualiza el que ya estaba.
     *
     * Si el cliente vuelve a cargar el mismo tipo y número —porque le renovaron
     * el documento y cambió solo la fecha— se actualiza en vez de duplicarse.
     * Dos filas del mismo documento con fechas distintas es peor que ninguna:
     * no se sabe cuál mirar.
     */
    @Transactional
    public DocumentoViajeDTO guardar(String email, DocumentoViajeDTO datos) {
        Cliente c = buscar(email);

        DocumentoViaje.Tipo tipo = parseTipo(datos.getTipo());
        String numero = datos.getNumero() == null ? "" : datos.getNumero().trim().toUpperCase();
        if (numero.isBlank())
            throw new RuntimeException("Escribe el número del documento");
        if (numero.length() > 30)
            throw new RuntimeException("Ese número es demasiado largo");

        LocalDate expira = parseFecha(datos.getFechaExpiracion());
        if (expira != null && expira.isBefore(LocalDate.now().minusYears(20)))
            throw new RuntimeException("Revisa la fecha de vencimiento");

        DocumentoViaje d = documentos.findByClienteIdAndTipoAndNumero(c.getId(), tipo, numero)
                .orElse(null);

        if (d == null) {
            if (documentos.countByClienteId(c.getId()) >= MAXIMO_POR_CLIENTE)
                throw new RuntimeException("Ya tienes " + MAXIMO_POR_CLIENTE
                        + " documentos guardados. Borra uno para agregar otro.");
            d = new DocumentoViaje();
            d.setId(UUID.randomUUID().toString());
            d.setClienteId(c.getId());
            d.setTipo(tipo);
            d.setNumero(numero);
            d.setCreatedAt(LocalDateTime.now());
        }

        d.setPaisEmision(normalizarPais(datos.getPaisEmision()));
        d.setFechaExpiracion(expira);
        d.setUpdatedAt(LocalDateTime.now());
        documentos.save(d);

        return toDTO(d, LocalDate.now());
    }

    /** Lo borra. Es su documento: no se le pregunta por qué. */
    @Transactional
    public void borrar(String email, String id) {
        Cliente c = buscar(email);
        DocumentoViaje d = documentos.findByIdAndClienteId(id, c.getId())
                .orElseThrow(() -> new RuntimeException("Ese documento no es tuyo"));
        documentos.delete(d);
    }

    private Cliente buscar(String email) {
        return clientes.findByEmail(email == null ? "" : email.trim().toLowerCase())
                .orElseThrow(() -> new RuntimeException("Cuenta no encontrada"));
    }

    private static DocumentoViajeDTO toDTO(DocumentoViaje d, LocalDate hoy) {
        DocumentoViajeDTO dto = new DocumentoViajeDTO();
        dto.setId(d.getId());
        dto.setTipo(d.getTipo() != null ? d.getTipo().name() : null);
        dto.setPaisEmision(d.getPaisEmision());
        dto.setNumero(d.getNumero());
        dto.setFechaExpiracion(d.getFechaExpiracion() != null ? d.getFechaExpiracion().toString() : null);
        dto.setVencido(d.estaVencido(hoy));
        dto.setVencePronto(d.venceDentroDe(hoy, DIAS_DE_AVISO));
        return dto;
    }

    private static DocumentoViaje.Tipo parseTipo(String valor) {
        if (valor == null || valor.isBlank())
            throw new RuntimeException("Elige el tipo de documento");
        try { return DocumentoViaje.Tipo.valueOf(valor.trim().toUpperCase()); }
        catch (IllegalArgumentException e) { throw new RuntimeException("Tipo de documento desconocido"); }
    }

    private static LocalDate parseFecha(String valor) {
        if (valor == null || valor.isBlank()) return null;
        try { return LocalDate.parse(valor.trim()); }
        catch (DateTimeParseException e) { throw new RuntimeException("Revisa la fecha de vencimiento"); }
    }

    private static String normalizarPais(String valor) {
        if (valor == null || valor.isBlank()) return null;
        String v = valor.trim().toUpperCase();
        return v.length() == 2 ? v : null;
    }
}
