import { useState, useEffect } from "react";
import { estaLogueado, getMisAcompanantes } from "../services/authCliente";

/**
 * "Llenar con alguien de mi lista", arriba del formulario de cada pasajero.
 *
 * Es donde los acompañantes guardados sirven de verdad: quien compra para su
 * familia escribía cinco veces los mismos nombres y documentos.
 *
 * Si no hay sesión, o la lista está vacía, no se muestra nada: no tiene sentido
 * ofrecer algo que no se puede usar.
 */
export default function ElegirAcompanante({ onElegir }) {
  const [lista, setLista] = useState([]);

  useEffect(() => {
    if (!estaLogueado()) return;
    getMisAcompanantes().then(setLista).catch(() => setLista([]));
  }, []);

  if (!lista.length) return null;

  const elegir = (e) => {
    const a = lista.find((x) => x.id === e.target.value);
    if (!a) return;
    onElegir({
      tipoDocumento: a.tipoDocumento,
      pasajeroDocumento: a.numeroDocumento,
      pasajeroNombre: a.nombreCompleto,
      pasajeroTelefono: a.telefono || "",
      // La edad llega calculada del servidor: guardarla habría quedado vieja.
      edad: a.edad != null ? String(a.edad) : "",
      sexo: a.sexo || "Masculino",
    });
    e.target.value = "";
  };

  return (
    <div className="field" style={{ marginBottom: 10 }}>
      <label>Llenar con alguien de mi lista</label>
      <select defaultValue="" onChange={elegir}>
        <option value="">Escribir los datos a mano</option>
        {lista.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nombreCompleto} · {a.tipoDocumento} {a.numeroDocumento}
          </option>
        ))}
      </select>
    </div>
  );
}
