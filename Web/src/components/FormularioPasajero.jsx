export default function FormularioPasajero({ datos, setDatos }) {
  const set = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value });

  return (
    <div>
      <p className="muted">Ingresa los datos del pasajero. Enviaremos el boleto y el QR al correo indicado.</p>
      <div className="form-grid" style={{ marginTop: 16 }}>
        <div className="field">
          <label>Tipo de documento</label>
          <select value={datos.tipoDocumento} onChange={set("tipoDocumento")}>
            <option value="DNI">DNI</option>
            <option value="CE">Carné de extranjería</option>
            <option value="PASAPORTE">Pasaporte</option>
          </select>
        </div>
        <div className="field">
          <label>Número de documento</label>
          <input value={datos.pasajeroDocumento} onChange={set("pasajeroDocumento")} placeholder="Ej. 45678912" />
        </div>
        <div className="field full">
          <label>Nombres y apellidos</label>
          <input value={datos.pasajeroNombre} onChange={set("pasajeroNombre")} placeholder="Nombre completo del pasajero" />
        </div>
        <div className="field">
          <label>Teléfono</label>
          <input value={datos.pasajeroTelefono} onChange={set("pasajeroTelefono")} placeholder="Ej. 965123456" />
        </div>
        <div className="field">
          <label>Correo electrónico</label>
          <input type="email" value={datos.clienteEmail} onChange={set("clienteEmail")} placeholder="tucorreo@ejemplo.com" />
        </div>
        <div className="field">
          <label>Edad</label>
          <input type="number" min="0" value={datos.edad} onChange={set("edad")} placeholder="Ej. 30" />
        </div>
        <div className="field">
          <label>Sexo</label>
          <select value={datos.sexo} onChange={set("sexo")}>
            <option value="Masculino">Masculino</option>
            <option value="Femenino">Femenino</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div className="field full">
          <label>Comprobante</label>
          <select value={datos.tipoComprobante} onChange={set("tipoComprobante")}>
            <option value="BOLETA">Boleta</option>
            <option value="FACTURA">Factura (requiere RUC)</option>
          </select>
        </div>
        {datos.tipoComprobante === "FACTURA" && (
          <>
            <div className="field"><label>RUC</label><input value={datos.clienteDocumento} onChange={set("clienteDocumento")} placeholder="RUC de la empresa" /></div>
            <div className="field"><label>Razón social</label><input value={datos.clienteNombre} onChange={set("clienteNombre")} placeholder="Nombre de la empresa" /></div>
          </>
        )}
      </div>
    </div>
  );
}
