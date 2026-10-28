package com.example.demo.repository;

import com.example.demo.model.IntentoLogin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface IntentoLoginRepository extends JpaRepository<IntentoLogin, String> {

    /**
     * Suma un fallo sin leer antes.
     *
     * <p>Leer, sumar y guardar pierde cuentas cuando entran dos intentos a la
     * vez: los dos leen 4 y los dos escriben 5. Con plata eso ya nos costó un
     * pasaje regalado; acá costaría intentos de más antes de bloquear, que es
     * justo lo que el atacante quiere.
     */
    /* clearAutomatically: un UPDATE así va directo a la base y NO toca las copias
       que Hibernate tiene en memoria. Spring mantiene una sola sesión por
       petición (open-in-view), y en el login la fila ya se leyó al comprobar si
       estaba bloqueada: sin limpiar, el findById de después devolvía la copia
       vieja con un fallo menos y NUNCA se llegaba al límite. El contador subía
       en la base y el bloqueo no se aplicaba jamás. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE IntentoLogin i SET i.fallos = i.fallos + 1, i.ultimoFallo = :ahora "
         + "WHERE i.llave = :llave")
    int sumarFallo(@Param("llave") String llave, @Param("ahora") LocalDateTime ahora);

    /**
     * Aplica el bloqueo solo si todavía corresponde.
     *
     * <p>La condición sobre `fallos` hace que, si dos intentos llegan juntos al
     * límite, solo uno bloquee: el otro actualiza cero filas. Sin eso, los dos
     * sumarían a `bloqueos` y el siguiente bloqueo duraría de más.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE IntentoLogin i SET i.bloqueadoHasta = :hasta, i.bloqueos = i.bloqueos + 1, "
         + "i.fallos = 0 WHERE i.llave = :llave AND i.fallos >= :tolerancia")
    int bloquearSiCorresponde(@Param("llave") String llave,
                              @Param("hasta") LocalDateTime hasta,
                              @Param("tolerancia") int tolerancia);

    /** Saca lo que ya no sirve: ni bloqueo vigente ni fallos recientes. */
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM IntentoLogin i WHERE "
         + "(i.bloqueadoHasta IS NULL OR i.bloqueadoHasta < :ahora) "
         + "AND (i.ultimoFallo IS NULL OR i.ultimoFallo < :corte)")
    int limpiar(@Param("ahora") LocalDateTime ahora, @Param("corte") LocalDateTime corte);
}
