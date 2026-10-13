package com.example.demo.service;

import com.example.demo.dto.DocumentoViajeDTO;
import com.example.demo.model.Cliente;
import com.example.demo.model.DocumentoViaje;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.repository.DocumentoViajeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Los documentos con los que el cliente puede viajar.
 *
 * Lo que de verdad resuelve esto no es ahorrar tecleo: es el vencimiento. Nadie
 * se acuerda de cuándo caduca su documento hasta que está en el muelle y no
 * puede embarcar.
 */
class DocumentosViajeTest {

    private DocumentoViajeRepository repo;
    private DocumentosViajeService servicio;
    private final List<DocumentoViaje> guardados = new ArrayList<>();

    @BeforeEach
    void prepararUnCliente() {
        repo = mock(DocumentoViajeRepository.class);
        ClienteRepository clientes = mock(ClienteRepository.class);

        Cliente c = new Cliente();
        c.setId("c-1");
        c.setEmail("nelida@ejemplo.pe");
        when(clientes.findByEmail("nelida@ejemplo.pe")).thenReturn(Optional.of(c));

        guardados.clear();
        when(repo.save(any(DocumentoViaje.class))).thenAnswer(i -> {
            DocumentoViaje d = i.getArgument(0);
            guardados.removeIf(x -> x.getId().equals(d.getId()));
            guardados.add(d);
            return d;
        });
        when(repo.countByClienteId("c-1")).thenAnswer(i -> (long) guardados.size());
        when(repo.findByClienteIdAndTipoAndNumero(anyString(), any(), anyString()))
                .thenAnswer(i -> guardados.stream()
                        .filter(d -> d.getTipo() == i.getArgument(1)
                                  && d.getNumero().equals(i.getArgument(2)))
                        .findFirst());

        servicio = new DocumentosViajeService(repo, clientes);
    }

    @Test
    @DisplayName("Guarda un pasaporte con su vencimiento")
    void guardaUno() {
        DocumentoViajeDTO d = servicio.guardar("nelida@ejemplo.pe",
                datos("PASAPORTE", "PE", "a1234567", "2030-05-20"));

        assertEquals("PASAPORTE", d.getTipo());
        assertEquals("A1234567", d.getNumero(), "el número se guarda en mayúsculas");
        assertEquals("PE", d.getPaisEmision());
        assertFalse(d.isVencido());
        assertFalse(d.isVencePronto());
    }

    @Test
    @DisplayName("Si lo renuevan, se actualiza en vez de duplicarse")
    void noDuplicaElMismo() {
        servicio.guardar("nelida@ejemplo.pe", datos("DNI", "PE", "05612844", "2027-01-10"));
        servicio.guardar("nelida@ejemplo.pe", datos("DNI", "PE", "05612844", "2035-01-10"));

        assertEquals(1, guardados.size(), "dos filas del mismo documento con fechas distintas "
                + "es peor que ninguna: no se sabe cuál mirar");
        assertEquals(LocalDate.of(2035, 1, 10), guardados.get(0).getFechaExpiracion());
    }

    @Test
    @DisplayName("Avisa cuando el documento ya venció")
    void avisaElVencido() {
        DocumentoViajeDTO d = servicio.guardar("nelida@ejemplo.pe",
                datos("DNI", "PE", "05612844", LocalDate.now().minusDays(1).toString()));
        assertTrue(d.isVencido());
    }

    @Test
    @DisplayName("Y avisa con noventa días de anticipación, que alcanzan para renovarlo")
    void avisaAntesDeQueVenza() {
        DocumentoViajeDTO pronto = servicio.guardar("nelida@ejemplo.pe",
                datos("PASAPORTE", "PE", "A1", LocalDate.now().plusDays(30).toString()));
        assertTrue(pronto.isVencePronto());
        assertFalse(pronto.isVencido(), "todavía sirve: avisar no es lo mismo que bloquear");

        DocumentoViajeDTO lejos = servicio.guardar("nelida@ejemplo.pe",
                datos("CE", "PE", "B2", LocalDate.now().plusDays(200).toString()));
        assertFalse(lejos.isVencePronto());
    }

    @Test
    @DisplayName("Un documento sin fecha no vence nunca")
    void sinFechaNoVence() {
        DocumentoViajeDTO d = servicio.guardar("nelida@ejemplo.pe", datos("CPF", "BR", "123456789", null));
        assertFalse(d.isVencido());
        assertFalse(d.isVencePronto());
        assertNull(d.getFechaExpiracion());
    }

    @Test
    @DisplayName("No guarda sin número ni con un tipo que no existe")
    void rechazaLoIncompleto() {
        assertThrows(RuntimeException.class,
                () -> servicio.guardar("nelida@ejemplo.pe", datos("DNI", "PE", "   ", null)));
        assertThrows(RuntimeException.class,
                () -> servicio.guardar("nelida@ejemplo.pe", datos("LICENCIA", "PE", "123", null)));
        assertThrows(RuntimeException.class,
                () -> servicio.guardar("nelida@ejemplo.pe", datos("DNI", "PE", "123", "no-es-fecha")));
    }

    @Test
    @DisplayName("Hay un tope: nadie necesita diez documentos")
    void tieneTope() {
        for (int i = 0; i < DocumentosViajeService.MAXIMO_POR_CLIENTE; i++)
            servicio.guardar("nelida@ejemplo.pe", datos("PASAPORTE", "PE", "N" + i, null));

        RuntimeException e = assertThrows(RuntimeException.class,
                () -> servicio.guardar("nelida@ejemplo.pe", datos("PASAPORTE", "PE", "UNO-MAS", null)));
        assertTrue(e.getMessage().contains("Borra uno"));
    }

    @Test
    @DisplayName("No se puede borrar el documento de otro")
    void noBorraElAjeno() {
        when(repo.findByIdAndClienteId("de-otro", "c-1")).thenReturn(Optional.empty());
        RuntimeException e = assertThrows(RuntimeException.class,
                () -> servicio.borrar("nelida@ejemplo.pe", "de-otro"));
        assertTrue(e.getMessage().contains("no es tuyo"));
    }

    private static DocumentoViajeDTO datos(String tipo, String pais, String numero, String expira) {
        DocumentoViajeDTO d = new DocumentoViajeDTO();
        d.setTipo(tipo); d.setPaisEmision(pais); d.setNumero(numero); d.setFechaExpiracion(expira);
        return d;
    }
}
