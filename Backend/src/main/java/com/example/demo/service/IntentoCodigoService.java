package com.example.demo.service;

import com.example.demo.model.CodigoVerificacion;
import com.example.demo.repository.CodigoVerificacionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Guarda el intento fallido en su PROPIA transacción.
 *
 * Vive en una clase aparte por dos razones que se cruzan:
 *
 *  1. Al rechazar un código se lanza una excepción, y eso hace rollback de la
 *     transacción en curso — incluido el incremento del contador. El resultado
 *     era que los intentos nunca subían y el código de 6 dígitos se podía probar
 *     sin límite, que es justo lo que el contador debía impedir.
 *
 *  2. Spring aplica @Transactional por proxy, así que llamarse a sí mismo desde
 *     DobleFactorService no habría abierto ninguna transacción nueva.
 */
@Service
public class IntentoCodigoService {

    private final CodigoVerificacionRepository repositorio;

    public IntentoCodigoService(CodigoVerificacionRepository repositorio) {
        this.repositorio = repositorio;
    }

    /** Suma uno y confirma, pase lo que pase después. Devuelve los intentos ya usados. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int registrarFallo(String codigoId) {
        CodigoVerificacion c = repositorio.findById(codigoId).orElse(null);
        if (c == null) return CodigoVerificacion.MAX_INTENTOS;

        c.setIntentos(c.getIntentos() + 1);
        repositorio.save(c);
        return c.getIntentos();
    }
}
