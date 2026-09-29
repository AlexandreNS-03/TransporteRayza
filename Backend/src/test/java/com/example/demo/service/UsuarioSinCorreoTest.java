package com.example.demo.service;

import com.example.demo.dto.UsuarioDTO;
import com.example.demo.dto.UsuarioRequest;
import com.example.demo.model.Usuario;
import com.example.demo.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * El correo de un usuario es opcional, pero la columna tiene índice único.
 *
 * MySQL admite varios NULL en un índice único, pero no varias cadenas vacías.
 * Como el formulario manda "" cuando el campo queda sin llenar, al crear la
 * segunda cuenta sin correo saltaba
 * "Duplicate entry '' for key 'usuarios.uq_usuario_email'".
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class UsuarioSinCorreoTest {

    @Autowired private UsuarioService usuarioService;
    @Autowired private UsuarioRepository usuarioRepository;

    private UsuarioRequest pedido(String username, String email) {
        UsuarioRequest r = new UsuarioRequest();
        r.setUsername(username);
        r.setPassword("clave-de-prueba");
        r.setNombre("Personal de prueba");
        r.setEmail(email);
        r.setRol("EMPLEADO");
        return r;
    }

    @Test
    void dosUsuariosSinCorreoSePuedenCrear() {
        usuarioService.crearUsuario(pedido("mostrador1", ""));
        usuarioService.crearUsuario(pedido("mostrador2", ""));

        assertEquals(2, usuarioRepository.findAll().stream()
                .filter(u -> u.getUsername().startsWith("mostrador"))
                .count(), "las dos cuentas sin correo tienen que existir");
    }

    @Test
    void elCorreoVacioSeGuardaComoNulo() {
        UsuarioDTO creado = usuarioService.crearUsuario(pedido("sincorreo", ""));

        Usuario guardado = usuarioRepository.findById(creado.getId()).orElseThrow();
        assertNull(guardado.getEmail(),
                "un correo en blanco tiene que quedar NULL, no cadena vacía");
    }

    @Test
    void elCorreoEnBlancoTambienCuentaComoVacio() {
        UsuarioDTO creado = usuarioService.crearUsuario(pedido("soloespacios", "   "));

        assertNull(usuarioRepository.findById(creado.getId()).orElseThrow().getEmail());
    }

    @Test
    void alCorreoDeVerdadSeLeRecortanLosEspacios() {
        UsuarioDTO creado = usuarioService.crearUsuario(pedido("concorreo", "  ventas@transporterayza.com  "));

        assertEquals("ventas@transporterayza.com",
                usuarioRepository.findById(creado.getId()).orElseThrow().getEmail(),
                "un espacio de más no puede volver distinto al mismo correo");
    }
}
