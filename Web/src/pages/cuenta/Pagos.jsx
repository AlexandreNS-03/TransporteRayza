import CuentaLayout from "../../components/CuentaLayout";
import MetodosGuardados from "../../components/MetodosGuardados";
import Wallet from "../../components/Wallet";

/**
 * Formas de pago: primero la wallet y después las tarjetas guardadas.
 *
 * En ese orden porque la wallet es plata que ya es suya —se mira todos los
 * días— y las tarjetas son una comodidad para la próxima compra.
 */
export default function Pagos() {
  return (
    <CuentaLayout titulo="Formas de pago">
      <Wallet />
      <h4 style={{ marginTop: 34 }}>Tarjetas y Yape guardados</h4>
      <MetodosGuardados />
    </CuentaLayout>
  );
}
