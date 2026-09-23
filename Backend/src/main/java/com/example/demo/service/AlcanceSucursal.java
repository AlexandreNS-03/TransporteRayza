package com.example.demo.service;

import com.example.demo.model.Rol;
import com.example.demo.model.Usuario;
import com.example.demo.model.Viaje;
import com.example.demo.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

/**
 * Hasta dónde llega cada usuario: su sucursal y nada más.
 *
 * Quien atiende en Requena no tiene nada que hacer con las salidas de Iquitos
 * —ni verlas, ni venderlas, ni moverles el horario—: son otra operación, con
 * otra caja y otro puerto. Mezclarlas es como terminaron pasando cosas que
 * después nadie sabe explicar.
 *
 * Dos excepciones, y son a propósito:
 *
 *   - El ADMIN ve todo. Es quien ordena el desorden cuando algo se cruza.
 *   - Un usuario SIN sucursal asignada también ve todo. Si no fuera así, una
 *     cuenta mal configurada dejaría a alguien sin poder trabajar, y eso en un
 *     mostrador que vende todos los días es peor que el riesgo que evita.
 *     Para cerrarle el alcance a alguien, hay que asignarle su sucursal.
 */
@Service
public class AlcanceSucursal {

    private final UsuarioRepository usuarioRepository;

    public AlcanceSucursal(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    /** La sucursal a la que está limitado el usuario, o null si ve todo. */
    public String sucursalDe(String usuarioNombre) {
        if (usuarioNombre == null) return null;
        Usuario u = usuarioRepository.findByUsername(usuarioNombre).orElse(null);
        if (u == null || u.getRol() == Rol.ADMIN) return null;
        return u.getSucursalId();
    }

    /** true si el usuario puede trabajar con algo de esa sucursal. */
    public boolean alcanza(String usuarioNombre, String sucursalId) {
        String mia = sucursalDe(usuarioNombre);
        return mia == null || mia.equals(sucursalId);
    }

    /**
     * Corta la operación si el viaje es de otra sucursal.
     *
     * El mensaje dice de qué sucursal es y no solo "no tienes permiso": quien
     * está en el mostrador necesita entender que se equivocó de viaje, no creer
     * que el sistema se rompió.
     */
    public void exigirAcceso(String usuarioNombre, Viaje viaje) {
        if (viaje == null || alcanza(usuarioNombre, viaje.getSucursalId())) return;
        throw new RuntimeException("Ese viaje es de "
                + (viaje.getSucursalNombre() != null ? viaje.getSucursalNombre() : "otra sucursal")
                + ": solo puedes trabajar con los de la tuya.");
    }
}
