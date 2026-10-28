package com.example.demo.service;

import com.example.demo.model.Cliente;
import com.example.demo.model.Usuario;
import com.example.demo.model.Rol;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Qué sesiones siguen valiendo.
 *
 * Un token firmado no se puede borrar: una vez emitido vale hasta que vence.
 * Lo que se prueba acá son los tres casos donde eso era un agujero y cerrar
 * sesión en el navegador no arreglaba nada, porque eso solo borra la copia del
 * que ya se fue.
 */
class SesionesTest {

    private UsuarioRepository usuarios;
    private ClienteRepository clientes;
    private SesionesService sesiones;
    private Usuario pedro;
    private Cliente ana;

    private static final Instant AYER = Instant.now().minusSeconds(86_400);
    private static final Instant RECIEN = Instant.now();

    @BeforeEach
    void prepararUnaCuentaDeCadaTipo() {
        usuarios = mock(UsuarioRepository.class);
        clientes = mock(ClienteRepository.class);

        pedro = new Usuario();
        pedro.setId("u-1");
        pedro.setUsername("pedro");
        pedro.setRol(Rol.SUPERVISOR);
        pedro.setActivo(true);
        when(usuarios.findByUsername("pedro")).thenReturn(Optional.of(pedro));

        ana = new Cliente();
        ana.setId("c-1");
        ana.setEmail("ana@ejemplo.pe");
        ana.setActivo(true);
        when(clientes.findByEmail("ana@ejemplo.pe")).thenReturn(Optional.of(ana));

        sesiones = new SesionesService(usuarios, clientes);
    }

    @Test
    @DisplayName("Un token normal de una cuenta activa vale")
    void loNormalVale() {
        assertTrue(sesiones.vale("pedro", "SUPERVISOR", AYER));
        assertTrue(sesiones.vale("ana@ejemplo.pe", "CLIENTE", AYER));
    }

    /* ── Los tres agujeros ── */

    @Test
    @DisplayName("Cambiar la contraseña echa al que estaba adentro")
    void cambiarLaClaveEcha() {
        // Es el caso para el que uno cambia la contraseña: alguien te entró.
        pedro.setSesionesDesde(LocalDateTime.now());
        ana.setSesionesDesde(LocalDateTime.now());

        assertFalse(sesiones.vale("pedro", "SUPERVISOR", AYER));
        assertFalse(sesiones.vale("ana@ejemplo.pe", "CLIENTE", AYER));
    }

    @Test
    @DisplayName("Desactivar una cuenta la saca ahora, no mañana")
    void desactivarSaca() {
        pedro.setActivo(false);
        assertFalse(sesiones.vale("pedro", "SUPERVISOR", RECIEN));

        ana.setActivo(false);
        assertFalse(sesiones.vale("ana@ejemplo.pe", "CLIENTE", RECIEN));
    }

    @Test
    @DisplayName("Bajarle el rol invalida el token que decía el rol viejo")
    void bajarElRolInvalida() {
        // El rol viaja DENTRO del token: sin esto, un supervisor degradado a
        // empleado seguía siendo supervisor hasta que su token venciera.
        pedro.setRol(Rol.EMPLEADO);
        assertFalse(sesiones.vale("pedro", "SUPERVISOR", RECIEN),
                "el token dice SUPERVISOR y en la base ya es EMPLEADO");
        assertTrue(sesiones.vale("pedro", "EMPLEADO", RECIEN));
    }

    /* ── Los bordes ── */

    @Test
    @DisplayName("El token que se emite justo al cortar sobrevive")
    void elTokenReciénEmitidoSobrevive() {
        // Cambiar la clave y recibir el token nuevo ocurren en el mismo segundo,
        // y el `iat` va en segundos enteros. Si este caso fallara, el usuario
        // quedaría afuera justo después de escribir su contraseña nueva.
        LocalDateTime ahora = LocalDateTime.now();
        pedro.setSesionesDesde(ahora);
        assertTrue(sesiones.vale("pedro", "SUPERVISOR", Instant.now()));
    }

    @Test
    @DisplayName("Un token de un segundo antes del corte NO sobrevive")
    void unSegundoAntesNoSobrevive() {
        // La primera versión restaba un segundo entero en vez de truncar, y daba
        // hasta dos segundos de gracia: contra el servidor, cambiar la clave
        // justo después de entrar no echaba a nadie.
        LocalDateTime corte = LocalDateTime.now();
        pedro.setSesionesDesde(corte);

        Instant unSegundoAntes = corte.atZone(java.time.ZoneId.systemDefault())
                .toInstant().truncatedTo(java.time.temporal.ChronoUnit.SECONDS)
                .minusSeconds(1);
        assertFalse(sesiones.vale("pedro", "SUPERVISOR", unSegundoAntes));
    }

    @Test
    @DisplayName("Una cuenta que nunca cortó sesiones acepta sus tokens viejos")
    void sinCorteNadieQuedaAfuera() {
        // Es lo que pasa al desplegar esto: la columna arranca en NULL y nadie
        // tiene que volver a entrar.
        pedro.setSesionesDesde(null);
        assertTrue(sesiones.vale("pedro", "SUPERVISOR", AYER));
    }

    @Test
    @DisplayName("Un token de una cuenta que ya no existe no vale")
    void cuentaBorrada() {
        assertFalse(sesiones.vale("fantasma", "ADMIN", RECIEN));
        assertFalse(sesiones.vale("fantasma@ejemplo.pe", "CLIENTE", RECIEN));
    }

    @Test
    @DisplayName("Un token sin fecha de emisión no vale")
    void sinFechaNoVale() {
        // Sin `iat` no hay forma de saber si es anterior al corte, y lo que no
        // se puede comprobar no se acepta.
        assertFalse(sesiones.vale("pedro", "SUPERVISOR", null));
    }
}
