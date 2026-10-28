package com.example.demo.service;

import com.example.demo.controller.PasajeroFrecuenteController;
import com.example.demo.dto.PasajeroFrecuenteDTO;
import com.example.demo.model.Cliente;
import com.example.demo.repository.ClienteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * La credencial de pasajero frecuente: el código y lo que el mostrador ve.
 *
 * <p>Lo que se prueba acá es lo que pasa en una ventanilla: alguien dicta seis
 * letras a través de un vidrio y quien atiende las escribe como las escuchó.
 */
class CredencialPasajeroTest {

    private final Map<String, Cliente> porCodigo = new HashMap<>();
    private PasajeroFrecuenteController mostrador;

    @BeforeEach
    void prepararUnaCuenta() {
        Cliente c = new Cliente();
        c.setCodigoPasajero("RZ-TS3899");
        c.setNombres("Nélida");
        c.setApellidos("Pinedo Ahuanari");
        c.setTipoDocumento(Cliente.TipoDocumento.DNI);
        c.setNumeroDocumento("71234568");
        c.setTelefono("965111222");
        c.setFechaNacimiento(LocalDate.of(1991, 4, 12));
        c.setGenero(Cliente.Genero.FEMENINO);
        c.setEmail("nelida@ejemplo.test");
        c.setActivo(true);
        porCodigo.put(c.getCodigoPasajero(), c);

        ClienteRepository repo = mock(ClienteRepository.class);
        when(repo.findByCodigoPasajero(anyString()))
                .thenAnswer(inv -> Optional.ofNullable(porCodigo.get(inv.getArgument(0, String.class))));

        // La wallet apagada: lo que se prueba acá es la credencial, no el saldo.
        WalletService sinWallet = new WalletService(null, null, null, null, null, null) {
            @Override public boolean estaHabilitada() { return false; }
        };
        // Sin programa de fidelidad: acá se prueba la credencial, no las categorías.
        CategoriaPasajero sinCategorias = new CategoriaPasajero(null) {
            @Override public Estado de(String documento) {
                return new Estado(Nivel.RAYZA, 0, 0, null, 0);
            }
        };
        mostrador = new PasajeroFrecuenteController(repo, sinWallet, sinCategorias);
    }

    @Test
    @DisplayName("El código no lleva letras que se confundan al dictarlas")
    void sinLetrasAmbiguas() {
        // Se dicta en voz alta con el motor de una lancha al lado: una O que
        // se escucha como cero deja el código inservible.
        for (int i = 0; i < 400; i++) {
            String codigo = CodigoPasajero.nuevo();
            assertTrue(codigo.startsWith("RZ-"), codigo);
            assertEquals(9, codigo.length(), codigo);
            String cuerpo = codigo.substring(3);
            assertFalse(cuerpo.matches(".*[O0I1L].*"),
                    "El código " + codigo + " trae una letra que se confunde al dictarla");
        }
    }

    @Test
    @DisplayName("Dos códigos seguidos no salen iguales")
    void noSeRepiteSolo() {
        assertNotEquals(CodigoPasajero.nuevo(), CodigoPasajero.nuevo());
    }

    @Test
    @DisplayName("Lo encuentra aunque se escriba como se escuchó")
    void loEncuentraComoSeaQueLoEscriban() {
        // Lo que llega a la ventanilla no viene limpio.
        for (String dictado : new String[]{"RZ-TS3899", "rz-ts3899", "RZTS3899",
                                           "rz ts3899", "ts3899", "  RZ-ts3899  "}) {
            ResponseEntity<?> r = mostrador.porCodigo(dictado);
            assertEquals(HttpStatus.OK, r.getStatusCode(), "No encontró la cuenta con: " + dictado);
            assertEquals("RZ-TS3899", ((PasajeroFrecuenteDTO) r.getBody()).getCodigoPasajero());
        }
    }

    @Test
    @DisplayName("Devuelve lo que hace falta para vender, y nada más")
    void soloLoQueSirveParaLaVenta() {
        PasajeroFrecuenteDTO d = (PasajeroFrecuenteDTO) mostrador.porCodigo("RZ-TS3899").getBody();

        assertEquals("Nélida Pinedo Ahuanari", d.getNombreCompleto());
        assertEquals("DNI", d.getTipoDocumento());
        assertEquals("71234568", d.getNumeroDocumento());
        assertEquals("965111222", d.getTelefono());
        assertEquals("1991-04-12", d.getFechaNacimiento());
        assertEquals("Femenino", d.getSexo());

        // El correo de la cuenta no es dato de una venta: con él se intenta
        // entrar a la cuenta, y quien atiende no lo necesita para nada.
        for (var m : PasajeroFrecuenteDTO.class.getMethods())
            assertFalse(m.getName().toLowerCase().contains("email")
                        || m.getName().toLowerCase().contains("correo"),
                    "El mostrador no tiene por qué ver el correo de la cuenta");
    }

    @Test
    @DisplayName("Un código que no existe no dice si existe")
    void elQueNoExisteNoSeDelata() {
        ResponseEntity<?> r = mostrador.porCodigo("RZ-ZZZZZZ");
        assertEquals(HttpStatus.NOT_FOUND, r.getStatusCode());
    }

    @Test
    @DisplayName("Una cuenta dada de baja no se encuentra")
    void laCuentaInactivaNoApareceEnElMostrador() {
        porCodigo.get("RZ-TS3899").setActivo(false);
        assertEquals(HttpStatus.NOT_FOUND, mostrador.porCodigo("RZ-TS3899").getStatusCode());
    }
}
