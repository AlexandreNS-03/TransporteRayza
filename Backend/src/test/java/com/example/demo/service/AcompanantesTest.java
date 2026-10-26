package com.example.demo.service;

import com.example.demo.dto.AcompananteDTO;
import com.example.demo.model.AcompananteFrecuente;
import com.example.demo.model.Cliente;
import com.example.demo.repository.AcompananteFrecuenteRepository;
import com.example.demo.repository.ClienteRepository;
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
 * La gente con la que el cliente suele viajar.
 *
 * Quien compra para su familia escribe cinco veces los mismos nombres y
 * documentos. Esto lo guarda una vez — pero son datos de otra persona, así que
 * lo que se guarda y lo que no es parte de lo que hay que probar.
 */
class AcompanantesTest {

    private AcompananteFrecuenteRepository repo;
    private AcompanantesService servicio;
    private final List<AcompananteFrecuente> guardados = new ArrayList<>();

    @BeforeEach
    void prepararUnCliente() {
        repo = mock(AcompananteFrecuenteRepository.class);
        ClienteRepository clientes = mock(ClienteRepository.class);

        Cliente c = new Cliente();
        c.setId("c-1");
        c.setEmail("nelida@ejemplo.pe");
        when(clientes.findByEmail("nelida@ejemplo.pe")).thenReturn(Optional.of(c));

        guardados.clear();
        when(repo.save(any(AcompananteFrecuente.class))).thenAnswer(i -> {
            AcompananteFrecuente a = i.getArgument(0);
            guardados.removeIf(x -> x.getId().equals(a.getId()));
            guardados.add(a);
            return a;
        });
        when(repo.countByClienteId("c-1")).thenAnswer(i -> (long) guardados.size());
        when(repo.findByClienteIdAndTipoDocumentoAndNumeroDocumento(anyString(), anyString(), anyString()))
                .thenAnswer(i -> guardados.stream()
                        .filter(a -> a.getTipoDocumento().equals(i.getArgument(1))
                                  && a.getNumeroDocumento().equals(i.getArgument(2)))
                        .findFirst());

        servicio = new AcompanantesService(repo, clientes);
    }

    @Test
    @DisplayName("Guarda al acompañante con lo que pide el formulario de compra")
    void guardaUno() {
        AcompananteDTO a = servicio.guardar("nelida@ejemplo.pe",
                datos("Rosa Pinedo Ruiz", "DNI", "43890217", "1988-04-03", "Femenino", "965112233"));

        assertEquals("Rosa Pinedo Ruiz", a.getNombreCompleto());
        assertEquals("DNI", a.getTipoDocumento());
        assertEquals("43890217", a.getNumeroDocumento());
        assertEquals("Femenino", a.getSexo());
    }

    @Test
    @DisplayName("Guarda la fecha de nacimiento y calcula la edad, que no se guarda nunca")
    void laEdadSeCalcula() {
        LocalDate nacimiento = LocalDate.now().minusYears(30).minusDays(5);
        AcompananteDTO a = servicio.guardar("nelida@ejemplo.pe",
                datos("Edinson Ahuanari", "DNI", "60117903", nacimiento.toString(), "Masculino", null));

        assertEquals(30, a.getEdad());
        assertEquals(nacimiento.toString(), a.getFechaNacimiento());

        // Guardar la edad sería el error: al año siguiente diría 30 igual, y la
        // edad va al manifiesto. Un dato que envejece solo es un dato que miente.
        AcompananteFrecuente enBase = guardados.get(0);
        assertEquals(nacimiento, enBase.getFechaNacimiento());
        assertEquals(31, enBase.edadAl(LocalDate.now().plusYears(1)),
                "la edad se recalcula cada vez que se pide");
    }

    @Test
    @DisplayName("La misma persona no entra dos veces: se reconoce por el documento")
    void noDuplica() {
        servicio.guardar("nelida@ejemplo.pe", datos("Rosa Pinedo", "DNI", "43890217", null, null, null));
        servicio.guardar("nelida@ejemplo.pe", datos("Rosa Pinedo Ruiz", "DNI", "43890217", null, null, null));

        assertEquals(1, guardados.size(), "corregir el nombre no debería duplicar a la persona");
        assertEquals("Rosa Pinedo Ruiz", guardados.get(0).getNombreCompleto());
    }

    @Test
    @DisplayName("Corregir el nombre no borra la fecha de nacimiento ni el sexo")
    void noPierdeLoQueNoViene() {
        servicio.guardar("nelida@ejemplo.pe",
                datos("Rosa Pinedo", "DNI", "43890217", "1988-04-03", "Femenino", "965112233"));

        // Así llega un pedido que solo corrige el nombre. Antes esto dejaba a la
        // persona sin fecha de nacimiento ni sexo, en silencio — y la edad va al
        // manifiesto.
        AcompananteDTO soloNombre = new AcompananteDTO();
        soloNombre.setNombreCompleto("Rosa Pinedo Ruiz de Macedo");
        soloNombre.setTipoDocumento("DNI");
        soloNombre.setNumeroDocumento("43890217");
        AcompananteDTO despues = servicio.guardar("nelida@ejemplo.pe", soloNombre);

        assertEquals("Rosa Pinedo Ruiz de Macedo", despues.getNombreCompleto());
        assertEquals("1988-04-03", despues.getFechaNacimiento(), "se perdió la fecha de nacimiento");
        assertEquals("Femenino", despues.getSexo(), "se perdió el sexo");
        assertEquals("965112233", despues.getTelefono(), "se perdió el teléfono");
    }

    @Test
    @DisplayName("Pero mandar un campo vacío sí lo vacía: es distinto de no mandarlo")
    void elVacioSiVacia() {
        servicio.guardar("nelida@ejemplo.pe",
                datos("Rosa", "DNI", "43890217", "1988-04-03", "Femenino", "965112233"));

        AcompananteDTO sinTelefono = datos("Rosa", "DNI", "43890217", null, null, "");
        AcompananteDTO despues = servicio.guardar("nelida@ejemplo.pe", sinTelefono);

        assertNull(despues.getTelefono());
        assertEquals("1988-04-03", despues.getFechaNacimiento(),
                "lo que no se mandó sigue sin tocarse");
    }

    @Test
    @DisplayName("No guarda sin nombre, sin documento ni con un tipo que no existe")
    void rechazaLoIncompleto() {
        assertThrows(RuntimeException.class, () -> servicio.guardar("nelida@ejemplo.pe",
                datos("   ", "DNI", "123", null, null, null)));
        assertThrows(RuntimeException.class, () -> servicio.guardar("nelida@ejemplo.pe",
                datos("Alguien", "DNI", "  ", null, null, null)));
        assertThrows(RuntimeException.class, () -> servicio.guardar("nelida@ejemplo.pe",
                datos("Alguien", "LICENCIA", "123", null, null, null)));
    }

    @Test
    @DisplayName("No acepta una fecha de nacimiento futura")
    void rechazaNacimientoFuturo() {
        RuntimeException e = assertThrows(RuntimeException.class,
                () -> servicio.guardar("nelida@ejemplo.pe", datos("Alguien", "DNI", "1",
                        LocalDate.now().plusDays(1).toString(), null, null)));
        assertTrue(e.getMessage().toLowerCase().contains("futura"));
    }

    @Test
    @DisplayName("Un sexo que no es ninguno de los tres se descarta en vez de guardarse mal")
    void descartaSexoRaro() {
        AcompananteDTO a = servicio.guardar("nelida@ejemplo.pe",
                datos("Alguien", "DNI", "1", null, "lo-que-sea", null));
        assertNull(a.getSexo());
    }

    @Test
    @DisplayName("Hay un tope: guardar de más de terceros es exponer de más")
    void tieneTope() {
        for (int i = 0; i < AcompanantesService.MAXIMO_POR_CLIENTE; i++)
            servicio.guardar("nelida@ejemplo.pe", datos("Persona " + i, "DNI", "N" + i, null, null, null));

        RuntimeException e = assertThrows(RuntimeException.class,
                () -> servicio.guardar("nelida@ejemplo.pe", datos("Uno más", "DNI", "X", null, null, null)));
        assertTrue(e.getMessage().contains("Borra uno"));
    }

    @Test
    @DisplayName("No se puede borrar un acompañante de la lista de otro")
    void noBorraElAjeno() {
        when(repo.findByIdAndClienteId("de-otro", "c-1")).thenReturn(Optional.empty());
        RuntimeException e = assertThrows(RuntimeException.class,
                () -> servicio.borrar("nelida@ejemplo.pe", "de-otro"));
        assertTrue(e.getMessage().contains("no está en tu lista"));
    }

    private static AcompananteDTO datos(String nombre, String tipo, String numero,
                                        String nacimiento, String sexo, String telefono) {
        AcompananteDTO a = new AcompananteDTO();
        a.setNombreCompleto(nombre);
        a.setTipoDocumento(tipo);
        a.setNumeroDocumento(numero);
        a.setFechaNacimiento(nacimiento);
        a.setSexo(sexo);
        a.setTelefono(telefono);
        return a;
    }
}
