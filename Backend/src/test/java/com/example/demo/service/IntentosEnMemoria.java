package com.example.demo.service;

import com.example.demo.model.IntentoLogin;
import com.example.demo.repository.IntentoLoginRepository;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * La tabla de intentos, en un mapa.
 *
 * <p>Está acá y no copiada en cada prueba porque un mock vacío de este
 * repositorio hace que el freno NUNCA bloquee —`findById` devuelve vacío y el
 * servicio nunca llega a contar—, y entonces las pruebas que comprueban el
 * bloqueo pasan sin probar nada. Ya pasó.
 *
 * <p>Imita lo que hacen de verdad las dos consultas que importan: sumar sin
 * leer antes, y bloquear solo si los fallos todavía llegan al límite. De ahí
 * sale que dos intentos a la vez no pierdan la cuenta ni bloqueen dos veces.
 */
final class IntentosEnMemoria {

    private IntentosEnMemoria() { }

    static IntentoLoginRepository nuevo() {
        return sobre(new HashMap<>());
    }

    /** Varios repositorios sobre el MISMO mapa imitan dos instancias del servidor. */
    static IntentoLoginRepository sobre(Map<String, IntentoLogin> tabla) {
        IntentoLoginRepository repo = mock(IntentoLoginRepository.class);

        when(repo.findById(anyString()))
                .thenAnswer(i -> Optional.ofNullable(tabla.get(i.<String>getArgument(0))));

        when(repo.saveAndFlush(any(IntentoLogin.class))).thenAnswer(i -> {
            IntentoLogin x = i.getArgument(0);
            tabla.put(x.getLlave(), x);
            return x;
        });

        doAnswer(i -> { tabla.remove(i.<String>getArgument(0)); return null; })
                .when(repo).deleteById(anyString());

        when(repo.sumarFallo(anyString(), any(LocalDateTime.class))).thenAnswer(i -> {
            IntentoLogin x = tabla.get(i.<String>getArgument(0));
            if (x == null) return 0;                      // como el UPDATE que no encuentra fila
            x.setFallos(x.getFallos() + 1);
            x.setUltimoFallo(i.getArgument(1));
            return 1;
        });

        when(repo.bloquearSiCorresponde(anyString(), any(LocalDateTime.class), anyInt()))
                .thenAnswer(i -> {
                    IntentoLogin x = tabla.get(i.<String>getArgument(0));
                    // La condición del WHERE: si otro ya bajó los fallos, no bloquea.
                    if (x == null || x.getFallos() < (int) i.getArgument(2)) return 0;
                    x.setBloqueadoHasta(i.getArgument(1));
                    x.setBloqueos(x.getBloqueos() + 1);
                    x.setFallos(0);
                    return 1;
                });

        when(repo.limpiar(any(LocalDateTime.class), any(LocalDateTime.class))).thenAnswer(i -> {
            LocalDateTime ahora = i.getArgument(0), corte = i.getArgument(1);
            int antes = tabla.size();
            tabla.values().removeIf(x ->
                    (x.getBloqueadoHasta() == null || x.getBloqueadoHasta().isBefore(ahora))
                 && (x.getUltimoFallo() == null || x.getUltimoFallo().isBefore(corte)));
            return antes - tabla.size();
        });

        return repo;
    }
}
