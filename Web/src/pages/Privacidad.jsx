import Header from "../components/Header";
import Footer from "../components/Footer";
import { EMPRESA, telefonoBonito } from "../datos";

/**
 * Política de privacidad y cookies. Contenido de referencia — la empresa debe
 * revisarlo con su asesor legal y ajustarlo antes de considerarlo definitivo.
 */
const SECCIONES = [
  { t: "1. Quién es el responsable", items: [
    `${EMPRESA.nombre} ("Transportes Rayza"), con oficinas en Requena e Iquitos, región Loreto, Perú.`,
    `Ante cualquier consulta sobre tus datos, escríbenos a ${EMPRESA.correo} o llámanos al ${telefonoBonito}.`,
  ]},
  { t: "2. Qué datos recopilamos", items: [
    "Al comprar un pasaje: nombre y apellidos, tipo y número de documento, correo, teléfono y, si pides factura, el RUC y la razón social.",
    "Datos del viaje: ruta, fecha, asiento y comprobante emitido.",
    "Datos de navegación: cookies y métricas de uso del sitio (páginas visitadas, dispositivo), solo si aceptas las cookies.",
  ]},
  { t: "3. Para qué usamos tus datos", items: [
    "Emitir tu boleto y el comprobante electrónico (boleta o factura) y enviártelos por correo.",
    "Gestionar tu viaje, la atención al cliente y las consultas de soporte.",
    "Cumplir obligaciones legales y tributarias (SUNAT).",
    "Mejorar el sitio y la experiencia de compra (analítica, solo con tu consentimiento).",
  ]},
  { t: "4. Cookies", items: [
    "Usamos cookies necesarias para que el sitio funcione (por ejemplo, recordar tu preferencia de tema claro/oscuro).",
    "Usamos cookies de analítica (Google Analytics y Microsoft Clarity) para entender cómo se usa la web. Estas solo se activan si las aceptas en el aviso de cookies.",
    "Puedes rechazarlas desde el aviso o borrar las cookies desde tu navegador cuando quieras.",
  ]},
  { t: "5. Con quién se comparten", items: [
    "Pasarelas de pago (Izipay y Mercado Pago/Yape) para procesar el cobro de forma segura; los datos de tu tarjeta nunca pasan por nuestros servidores.",
    "Nuestro proveedor de facturación electrónica para emitir el comprobante ante SUNAT.",
    "Proveedores de correo y de analítica que nos ayudan a operar el servicio.",
    "No vendemos ni alquilamos tus datos personales a terceros.",
  ]},
  { t: "6. Cuánto tiempo los guardamos", items: [
    "Conservamos tus datos el tiempo necesario para prestarte el servicio y cumplir las obligaciones legales y contables aplicables.",
  ]},
  { t: "7. Tus derechos", items: [
    "Puedes acceder, rectificar, cancelar u oponerte al uso de tus datos personales (derechos ARCO), conforme a la Ley N.° 29733 de Protección de Datos Personales del Perú.",
    `Para ejercerlos, escríbenos a ${EMPRESA.correo} indicando tu solicitud.`,
  ]},
];

export default function Privacidad() {
  return (
    <>
      <Header />
      <section className="section">
        <div className="wrap" style={{ maxWidth: "min(820px, 100%)" }}>
          <h1 style={{ fontSize: "clamp(28px,5vw,40px)", margin: "8px 0 10px" }}>Política de privacidad y cookies</h1>
          <p className="muted" style={{ marginBottom: 30 }}>
            Cómo tratamos tus datos cuando usas nuestra web y compras tus pasajes.
          </p>

          {SECCIONES.map((s) => (
            <div className="card" key={s.t} style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, marginBottom: 10 }}>{s.t}</h3>
              <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8 }}>
                {s.items.map((it, i) => <li key={i} className="muted" style={{ fontSize: 15 }}>{it}</li>)}
              </ul>
            </div>
          ))}

          <p className="muted" style={{ fontSize: 13, marginTop: 20 }}>
            Este documento es referencial y puede actualizarse. La versión vigente es la publicada en esta página.
          </p>
        </div>
      </section>
      <Footer />
    </>
  );
}
