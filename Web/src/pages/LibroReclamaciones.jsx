import { useRef, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import { EMPRESA, telefonoBonito } from "../datos";
import { RUC_EMPRESA } from "../Utils/empresa";
import { registrarReclamacion } from "../services/publicApi";

/**
 * Libro de Reclamaciones virtual (INDECOPI, D.S. 011-2011-PCM).
 *
 * Los campos y su obligatoriedad salen de la norma, no de nuestro gusto. Se
 * registra sin cuenta a propósito: tiene que ser de acceso libre desde el mismo
 * medio donde se vende.
 *
 * Al terminar se muestra la hoja con su número correlativo y se puede imprimir o
 * guardar como PDF: la norma pide poder imprimirla o recibirla por correo, y acá
 * se hacen las dos cosas.
 */

const VACIO = {
  tipo: "RECLAMO",
  consumidorNombre: "",
  consumidorTipoDocumento: "DNI",
  consumidorDocumento: "",
  consumidorDomicilio: "",
  consumidorEmail: "",
  consumidorTelefono: "",
  menorDeEdad: false,
  apoderadoNombre: "",
  apoderadoDocumento: "",
  bienTipo: "SERVICIO",
  bienDescripcion: "",
  montoReclamado: "",
  detalle: "",
  pedido: "",
};

export default function LibroReclamaciones() {
  const [datos, setDatos] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [hoja, setHoja] = useState(null);
  const hojaRef = useRef(null);

  const cambiar = (campo) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setDatos((d) => ({ ...d, [campo]: v }));
  };

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const monto = datos.montoReclamado ? Number(datos.montoReclamado) : null;
      const r = await registrarReclamacion({ ...datos, montoReclamado: monto });
      setHoja(r);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  // Imprimir es también "guardar como PDF" en el diálogo del navegador, así que
  // con un solo botón se cubren las dos formas de quedarse con la copia.
  const descargar = () => window.print();

  if (hoja) {
    return (
      <>
        <Seo titulo="Hoja de Reclamación registrada" />
        <Header />
        <section className="section">
          <div className="wrap" style={{ maxWidth: "min(760px, 100%)" }}>
            <div className="card lr-hoja" ref={hojaRef}>
              <div className="lr-hoja-cab">
                <div>
                  <h1 style={{ margin: 0, fontSize: 24 }}>Hoja de Reclamación</h1>
                  <p className="muted" style={{ margin: "4px 0 0" }}>
                    {EMPRESA.nombre} · RUC {RUC_EMPRESA}
                  </p>
                </div>
                <div className="lr-numero">
                  <span>N°</span>
                  <strong>{hoja.numero}</strong>
                </div>
              </div>

              <p className="lr-ok">
                Registramos tu {hoja.tipo === "QUEJA" ? "queja" : "reclamo"}. Te enviamos una copia a{" "}
                <strong>{hoja.consumidorEmail}</strong>.
              </p>

              <dl className="lr-datos">
                <Dato t="Fecha" v={fechaBonita(hoja.createdAt)} />
                <Dato t="Tipo" v={hoja.tipo === "QUEJA" ? "Queja" : "Reclamo"} />
                <Dato t="Consumidor" v={hoja.consumidorNombre} />
                <Dato t="Documento" v={`${hoja.consumidorTipoDocumento || ""} ${hoja.consumidorDocumento || ""}`} />
                {hoja.consumidorTelefono && <Dato t="Teléfono" v={hoja.consumidorTelefono} />}
                {hoja.consumidorDomicilio && <Dato t="Domicilio" v={hoja.consumidorDomicilio} />}
                {hoja.apoderadoNombre && <Dato t="Padre / apoderado" v={hoja.apoderadoNombre} />}
                {hoja.bienDescripcion && <Dato t="Servicio" v={hoja.bienDescripcion} />}
                {hoja.montoReclamado != null && <Dato t="Monto reclamado" v={`S/ ${hoja.montoReclamado}`} />}
                <Dato t="Detalle" v={hoja.detalle} bloque />
                {hoja.pedido && <Dato t="Tu pedido" v={hoja.pedido} bloque />}
              </dl>

              <p className="lr-plazo">
                Te responderemos por correo a más tardar el <strong>{fechaCorta(hoja.limiteRespuesta)}</strong>,
                dentro de los 15 días hábiles que establece la norma.
                Guarda el número de tu hoja: es lo que te van a pedir si acudes a INDECOPI.
              </p>
            </div>

            <div className="lr-acciones">
              <button className="btn btn-primary" onClick={descargar}>
                Descargar o imprimir mi copia
              </button>
              <a className="btn btn-ghost" href="/">Volver al inicio</a>
            </div>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Seo
        titulo="Libro de Reclamaciones"
        descripcion="Registra tu reclamo o queja en el Libro de Reclamaciones virtual de Transportes Rayza."
      />
      <Header />
      <section className="section">
        <div className="wrap" style={{ maxWidth: "min(820px, 100%)" }}>
          <h1>Libro de Reclamaciones</h1>
          <p className="muted">
            Conforme al Código de Protección y Defensa del Consumidor (Ley 29571).
            Al enviarlo recibes una copia por correo y puedes descargarla.
          </p>

          <div className="lr-empresa">
            <strong>{EMPRESA.nombre}</strong> · RUC {RUC_EMPRESA} · Requena e Iquitos, Loreto ·{" "}
            {telefonoBonito}
          </div>

          <form className="card lr-form" onSubmit={enviar}>
            <fieldset>
              <legend>1. ¿Qué quieres registrar?</legend>
              <div className="lr-tipos">
                {[
                  { v: "RECLAMO", t: "Reclamo", d: "Disconformidad con el servicio que contrataste." },
                  { v: "QUEJA",   t: "Queja",   d: "Malestar por la atención que recibiste." },
                ].map((o) => (
                  <label key={o.v} className={`lr-tipo ${datos.tipo === o.v ? "activo" : ""}`}>
                    <input type="radio" name="tipo" value={o.v}
                           checked={datos.tipo === o.v} onChange={cambiar("tipo")} />
                    <span>
                      <strong>{o.t}</strong>
                      <small>{o.d}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>2. Tus datos</legend>
              <div className="lr-grid">
                <Campo ancho label="Nombre y apellidos *" v={datos.consumidorNombre}
                       on={cambiar("consumidorNombre")} req />
                <label className="campo">
                  <span>Tipo de documento</span>
                  <select value={datos.consumidorTipoDocumento} onChange={cambiar("consumidorTipoDocumento")}>
                    <option>DNI</option><option>CE</option><option>PASAPORTE</option><option>RUC</option>
                  </select>
                </label>
                <Campo label="Número de documento *" v={datos.consumidorDocumento}
                       on={cambiar("consumidorDocumento")} req inputMode="numeric" />
                <Campo label="Correo *" tipo="email" v={datos.consumidorEmail}
                       on={cambiar("consumidorEmail")} req ayuda="Ahí te llega tu copia y nuestra respuesta." />
                <Campo label="Teléfono" tipo="tel" v={datos.consumidorTelefono}
                       on={cambiar("consumidorTelefono")} inputMode="numeric" />
                <Campo ancho label="Domicilio" v={datos.consumidorDomicilio}
                       on={cambiar("consumidorDomicilio")} />
              </div>

              <label className="lr-check">
                <input type="checkbox" checked={datos.menorDeEdad} onChange={cambiar("menorDeEdad")} />
                <span>Soy menor de edad</span>
              </label>

              {/* La norma pide identificar al padre o representante cuando el
                  consumidor es menor de edad. */}
              {datos.menorDeEdad && (
                <div className="lr-grid">
                  <Campo label="Nombre del padre, madre o apoderado *"
                         v={datos.apoderadoNombre} on={cambiar("apoderadoNombre")} req />
                  <Campo label="Su documento" v={datos.apoderadoDocumento}
                         on={cambiar("apoderadoDocumento")} inputMode="numeric" />
                </div>
              )}
            </fieldset>

            <fieldset>
              <legend>3. Sobre el servicio</legend>
              <div className="lr-grid">
                <label className="campo">
                  <span>Tipo</span>
                  <select value={datos.bienTipo} onChange={cambiar("bienTipo")}>
                    <option value="SERVICIO">Servicio (pasaje, embarque)</option>
                    <option value="PRODUCTO">Producto (encomienda)</option>
                  </select>
                </label>
                <Campo label="Monto reclamado (S/)" v={datos.montoReclamado}
                       on={cambiar("montoReclamado")} inputMode="decimal" />
                <Campo ancho label="Descríbelo" v={datos.bienDescripcion}
                       on={cambiar("bienDescripcion")}
                       ayuda="Por ejemplo: pasaje Iquitos → Requena del 12 de agosto, boleto T001-000123." />
              </div>
            </fieldset>

            <fieldset>
              <legend>4. Cuéntanos qué pasó</legend>
              <label className="campo">
                <span>Detalle *</span>
                <textarea rows={5} required value={datos.detalle} onChange={cambiar("detalle")} />
              </label>
              <label className="campo">
                <span>¿Qué esperas de nosotros?</span>
                <textarea rows={3} value={datos.pedido} onChange={cambiar("pedido")} />
              </label>
            </fieldset>

            {error && <div className="alert alert-warn">{error}</div>}

            <p className="muted" style={{ fontSize: 13 }}>
              Al enviarlo aceptas que usemos tus datos para atender este caso, según nuestra{" "}
              <a href="/privacidad">política de privacidad</a>. Responderemos dentro de los
              15 días hábiles que establece la norma.
            </p>

            <button className="btn btn-primary" disabled={enviando}>
              {enviando ? "Enviando…" : "Enviar mi hoja"}
            </button>
          </form>
        </div>
      </section>
      <Footer />
    </>
  );
}

function Campo({ label, v, on, req, tipo = "text", ancho, ayuda, inputMode }) {
  return (
    <label className={`campo ${ancho ? "lr-ancho" : ""}`}>
      <span>{label}</span>
      <input type={tipo} value={v} onChange={on} required={req} inputMode={inputMode} />
      {ayuda && <small className="muted">{ayuda}</small>}
    </label>
  );
}

function Dato({ t, v, bloque }) {
  return (
    <div className={bloque ? "lr-dato lr-dato-bloque" : "lr-dato"}>
      <dt>{t}</dt>
      <dd>{v}</dd>
    </div>
  );
}

const fechaBonita = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" });
};

const fechaCorta = (iso) => {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return new Date(a, m - 1, d).toLocaleDateString("es-PE", { dateStyle: "long" });
};
