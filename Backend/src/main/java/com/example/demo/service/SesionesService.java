package com.example.demo.service;

import com.example.demo.model.Cliente;
import com.example.demo.model.Usuario;
import com.example.demo.repository.ClienteRepository;
import com.example.demo.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Qué sesiones siguen valiendo.
 *
 * <p><strong>Un token firmado no se puede borrar.</strong> Una vez emitido vale
 * hasta que vence —acá, veinticuatro horas— y el servidor no tenía forma de
 * desconocerlo. Eso dejaba tres agujeros que no se arreglan con cerrar sesión
 * en el navegador, porque eso solo borra la copia del que ya se fue:
 *
 * <ul>
 *   <li><strong>Cambiar la contraseña no echaba a nadie.</strong> Si alguien te
 *       robó la cuenta y vos cambiás la clave, su token seguía andando un día
 *       entero. Justo el caso para el que uno cambia la contraseña.</li>
 *   <li><strong>Desactivar a un empleado no lo sacaba.</strong> Se apagaba la
 *       cuenta y el token que ya tenía en el navegador seguía entrando hasta el
 *       día siguiente.</li>
 *   <li><strong>Bajarle el rol tampoco.</strong> El rol viaja dentro del token,
 *       así que un supervisor degradado a empleado seguía siendo supervisor
 *       para el sistema hasta que su token venciera.</li>
 * </ul>
 *
 * <p>La solución no es guardar una lista de tokens vivos —habría que limpiarla,
 * y un token perdido quedaría dentro— sino una fecha por cuenta:
 * <strong>si el token se emitió antes de {@code sesionesDesde}, no sirve.</strong>
 * Una sola columna mata todas las sesiones de alguien de golpe.
 *
 * <p>El precio es una consulta por pedido. En un sistema de este tamaño no se
 * nota, y a cambio el rol y el "está activo" se leen de la base en cada pedido
 * en vez de creerle a un papel firmado ayer.
 */
@Service
public class SesionesService {

    private final UsuarioRepository usuarios;
    private final ClienteRepository clientes;

    public SesionesService(UsuarioRepository usuarios, ClienteRepository clientes) {
        this.usuarios = usuarios;
        this.clientes = clientes;
    }

    /**
     * ¿Este token sigue valiendo?
     *
     * @param sujeto   el usuario (personal) o el correo (cliente)
     * @param rol      el rol que dice el token
     * @param emitidoEn cuándo se emitió
     */
    public boolean vale(String sujeto, String rol, Instant emitidoEn) {
        if (sujeto == null || rol == null || emitidoEn == null) return false;

        if ("CLIENTE".equals(rol)) {
            Cliente c = clientes.findByEmail(sujeto.trim().toLowerCase()).orElse(null);
            if (c == null || Boolean.FALSE.equals(c.getActivo())) return false;
            return noEsAnterior(emitidoEn, c.getSesionesDesde());
        }

        Usuario u = usuarios.findByUsername(sujeto).orElse(null);
        if (u == null || !Boolean.TRUE.equals(u.getActivo())) return false;

        // El rol se lee de la base y no del token: si lo bajaron de supervisor a
        // empleado, el token viejo dice "supervisor" y no puede seguir valiendo.
        if (u.getRol() == null || !u.getRol().name().equals(rol)) return false;

        return noEsAnterior(emitidoEn, u.getSesionesDesde());
    }

    /**
     * ¿El token es de antes del corte?
     *
     * <p>El `iat` del token va en <strong>segundos enteros</strong> y el corte
     * tiene milisegundos. Comparar directo dejaría afuera al token que se emite
     * en el mismo segundo del corte —cambiar la contraseña y recibir el token
     * nuevo ocurren a la vez—, y el usuario quedaría fuera justo después de
     * escribir su contraseña nueva. Por eso el corte se trunca al segundo: el
     * token de ESE segundo sobrevive, el del segundo anterior no.
     *
     * <p>La primera versión de esto restaba un segundo entero en vez de
     * truncar, y daba hasta dos segundos de gracia: en una prueba donde
     * entrar y cambiar la clave ocurren seguido, el token viejo seguía
     * entrando. Contra el reloj de una persona no se nota; contra un script,
     * sí.
     */
    private boolean noEsAnterior(Instant emitidoEn, LocalDateTime desde) {
        if (desde == null) return true;   // cuenta que nunca cortó sus sesiones
        Instant corte = desde.atZone(ZoneId.systemDefault()).toInstant()
                             .truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
        return !emitidoEn.isBefore(corte);
    }

    /* ── Cortar sesiones ── */

    /**
     * Mata todas las sesiones abiertas del personal.
     *
     * <p>Se llama al cambiarle la contraseña, al cambiarle el rol y al
     * desactivar la cuenta: en los tres casos lo que había antes dejó de valer.
     */
    @Transactional
    public void cortarDelPersonal(Usuario u) {
        if (u == null) return;
        u.setSesionesDesde(LocalDateTime.now());
        usuarios.save(u);
    }

    /** Lo mismo para un cliente: al cambiar la contraseña o al recuperarla. */
    @Transactional
    public void cortarDelCliente(Cliente c) {
        if (c == null) return;
        c.setSesionesDesde(LocalDateTime.now());
        clientes.save(c);
    }
}
