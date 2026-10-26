package com.example.demo.repository;

import com.example.demo.model.SaldoMovimiento;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface SaldoMovimientoRepository extends JpaRepository<SaldoMovimiento, String> {

    List<SaldoMovimiento> findByClienteEmailIgnoreCaseOrderByCreatedAtDesc(String email);

    @Query("SELECT COALESCE(SUM(m.monto), 0) FROM SaldoMovimiento m WHERE LOWER(m.clienteEmail) = LOWER(:email)")
    BigDecimal saldoDe(@Param("email") String email);

    /**
     * Para no contar dos veces el mismo movimiento cuando algo se reintenta.
     * La columna además es única: esto evita el error feo, la base evita el
     * error de verdad si dos pedidos entran a la vez.
     */
    Optional<SaldoMovimiento> findByReferencia(String referencia);

    /**
     * Los movimientos de alguien, tomándolos hasta el fin de la transacción.
     *
     * <p><strong>Esto existe por un bug que se cobró un pasaje gratis.</strong>
     * Dos pagos simultáneos con S/ 90 de saldo y S/ 90 cada uno pasaron los dos,
     * y el saldo quedó en −90. El bloqueo sobre la fila del cliente estaba y
     * funcionaba: el problema era la lectura.
     *
     * <p>MySQL trabaja en REPEATABLE READ, y en ese nivel la foto que ve la
     * transacción se saca en su PRIMERA lectura corriente, no cuando se toma el
     * candado. Las dos transacciones leyeron antes de bloquear —la consulta de
     * la referencia repetida—, así que después, ya con el candado en la mano,
     * {@code SUM(monto)} seguía devolviendo la foto vieja: 90 para las dos.
     *
     * <p>Una lectura con candado NO usa la foto: va a la última versión
     * confirmada. Por eso el saldo para cobrar se calcula sumando lo que
     * devuelve este método y no con {@link #saldoDe}, que es para mostrar. No
     * alcanza con reordenar las líneas: el día que alguien agregue una consulta
     * más arriba, la foto vuelve a adelantarse y el error vuelve, callado.
     *
     * <p>Trae las filas en vez de sumarlas en la base porque un SUM con candado
     * no es algo que MySQL acepte en todas sus versiones, y una billetera tiene
     * decenas de movimientos, no millones.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM SaldoMovimiento m WHERE LOWER(m.clienteEmail) = LOWER(:email)")
    List<SaldoMovimiento> bloquearMovimientosDe(@Param("email") String email);
}
