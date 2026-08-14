import { useState } from "react";

/**
 * Logo de la pasarela (Izipay / Yape) en los botones de método de pago.
 * Si la imagen no carga, cae al ícono de respaldo para que el botón no quede vacío.
 */
export default function LogoPasarela({ archivo, alt, respaldo }) {
  const [falla, setFalla] = useState(false);
  if (falla) return <span className="metodo-icono">{respaldo}</span>;
  return <img className="metodo-logo" src={`/pagos/${archivo}`} alt={alt} onError={() => setFalla(true)} />;
}
