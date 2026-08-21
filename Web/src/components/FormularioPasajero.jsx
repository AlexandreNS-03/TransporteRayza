/**
 * Datos personales de UN pasajero. El correo de contacto y el comprobante son del
 * grupo y se piden aparte (una sola vez), no por pasajero.
 */
export default function FormularioPasajero({ pasajero, setPasajero, titulo }) {
  const set = (campo) => (e) => setPasajero({ ...pasajero, [campo]: e.target.value });

  return (
    <div>
      {titulo && <h4 className="pasajero-titulo">{titulo}</h4>}
      <div className="form-grid">
        <div className="field">
          <label>Tipo de documento</label>
          <select value={pasajero.tipoDocumento} onChange={set("tipoDocumento")}>
            <option value="DNI">DNI</option>
            <option value="CE">Carné de extranjería</option>
            <option value="PASAPORTE">Pasaporte</option>
          </select>
        </div>
        <div className="field">
          <label>Número de documento</label>
          <input value={pasajero.pasajeroDocumento} onChange={set("pasajeroDocumento")} placeholder="Ej. 45678912" />
        </div>
        <div className="field full">
          <label>Nombres y apellidos</label>
          <input value={pasajero.pasajeroNombre} onChange={set("pasajeroNombre")} placeholder="Nombre completo del pasajero" />
        </div>
        <div className="field">
          <label>Teléfono</label>
          <input value={pasajero.pasajeroTelefono} onChange={set("pasajeroTelefono")} placeholder="Ej. 965123456" />
        </div>
        <div className="field">
          <label>Edad</label>
          <input type="number" min="0" value={pasajero.edad} onChange={set("edad")} placeholder="Ej. 30" />
        </div>
        <div className="field">
          <label>Sexo</label>
          <select value={pasajero.sexo} onChange={set("sexo")}>
            <option value="Masculino">Masculino</option>
            <option value="Femenino">Femenino</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
      </div>
    </div>
  );
}

/** Correo de contacto y comprobante: comunes a toda la compra. */
export function FormularioContacto({ contacto, setContacto, cantidadPasajes = 1 }) {
  const set = (campo) => (e) => setContacto({ ...contacto, [campo]: e.target.value });

  return (
    <div>
      <h4 className="pasajero-titulo">Contacto y comprobante</h4>
      <p className="muted" style={{ marginTop: 0 }}>Enviaremos los boletos con su QR a este correo.</p>
      <div className="form-grid">
        <div className="field full">
          <label>Correo electrónico</label>
          <input type="email" value={contacto.clienteEmail} onChange={set("clienteEmail")} placeholder="tucorreo@ejemplo.com" />
        </div>
        <div className="field full">
          <label>Comprobante</label>
          <select value={contacto.tipoComprobante} onChange={set("tipoComprobante")}>
            <option value="BOLETA">Boleta</option>
            <option value="FACTURA">Factura (requiere RUC)</option>
          </select>
        </div>
        {contacto.tipoComprobante === "FACTURA" && (
          <>
            <div className="field"><label>RUC</label><input value={contacto.clienteDocumento} onChange={set("clienteDocumento")} placeholder="RUC de la empresa" /></div>
            <div className="field"><label>Razón social</label><input value={contacto.clienteNombre} onChange={set("clienteNombre")} placeholder="Nombre de la empresa" /></div>
          </>
        )}

        {/* Con un solo pasaje no hay nada que decidir, así que ni se pregunta. */}
        {cantidadPasajes > 1 && (
          <div className="field full">
            <label>¿Cómo quieres el comprobante?</label>
            <div className="comprobante-opciones">
              <button type="button"
                      className={"comprobante-opcion" + (contacto.comprobanteUnico !== false ? " activo" : "")}
                      onClick={() => setContacto({ ...contacto, comprobanteUnico: true })}>
                <span className="comprobante-opcion-tit">Uno solo</span>
                <span className="comprobante-opcion-det">
                  Un {contacto.tipoComprobante === "FACTURA" ? "a factura" : "a boleta"} por los {cantidadPasajes} pasajes
                </span>
              </button>
              <button type="button"
                      className={"comprobante-opcion" + (contacto.comprobanteUnico === false ? " activo" : "")}
                      onClick={() => setContacto({ ...contacto, comprobanteUnico: false })}>
                <span className="comprobante-opcion-tit">Uno por pasajero</span>
                <span className="comprobante-opcion-det">
                  {cantidadPasajes} documentos, uno a nombre de cada quien
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
