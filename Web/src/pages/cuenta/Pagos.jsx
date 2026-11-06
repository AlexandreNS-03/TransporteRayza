import CuentaLayout from "../../components/CuentaLayout";
import Wallet from "../../components/Wallet";

/**
 * Formas de pago: hoy, la wallet.
 *
 * Acá abajo iban también las tarjetas y el Yape guardados
 * (`components/MetodosGuardados.jsx`). Se sacaron a propósito, no por error:
 * guardar la tarjeta está en pausa hasta que Izipay active la opción de alias
 * en nuestra cuenta, así que la lista estaba siempre vacía y el cartel decía
 * "cuando pagues con tarjeta te vamos a preguntar si quieres dejarla guardada".
 * Eso no iba a pasar. Una promesa que el sistema no cumple es peor que no
 * ofrecer nada.
 *
 * El componente sigue en el repo, entero y probado, porque la decisión es
 * pausar y no cancelar. Para volver a encenderlo: activar la opción con Izipay,
 * poner `izipay.tarjetas-guardadas.enabled=true` en el backend y devolver el
 * <MetodosGuardados /> acá debajo del Wallet.
 */
export default function Pagos() {
  return (
    <CuentaLayout titulo="Formas de pago">
      <Wallet />
    </CuentaLayout>
  );
}
