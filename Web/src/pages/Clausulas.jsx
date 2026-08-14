import Header from "../components/Header";
import Footer from "../components/Footer";
import { EMPRESA, telefonoBonito } from "../datos";

/**
 * Cláusulas / condiciones del viaje. Contenido de referencia — la empresa debe
 * revisarlo y ajustarlo a sus políticas reales antes de considerarlo definitivo.
 */
const CLAUSULAS = [
  { t: "1. Compra y boleto", items: [
    "El boleto es personal y corresponde al pasajero, tramo, fecha y asiento indicados.",
    "Al comprar en línea recibes tu boleto con código QR en pantalla y por correo; preséntalo al embarcar.",
    "Verifica tus datos (nombre, documento, ruta y fecha) antes de pagar.",
  ]},
  { t: "2. Embarque y puntualidad", items: [
    "Preséntate en el puerto con al menos 30 minutos de anticipación a la hora de salida.",
    "El embarque cierra a la hora programada; pasado ese momento no se garantiza el cupo.",
    "Los horarios son referenciales y pueden variar por condiciones del río o el clima.",
  ]},
  { t: "3. Equipaje", items: [
    "Cada pasajero puede llevar su equipaje de mano personal.",
    "La carga adicional se registra como encomienda y puede tener un costo aparte.",
    "La empresa no se responsabiliza por objetos de valor no declarados.",
  ]},
  { t: "4. Cambios y devoluciones", items: [
    "Los cambios de fecha u hora están sujetos a disponibilidad y deben solicitarse con anticipación.",
    "Las devoluciones se evalúan según el motivo y el tiempo de aviso previo a la salida.",
    "Para cualquier gestión, comunícate con nuestras oficinas.",
  ]},
  { t: "5. Menores de edad", items: [
    "Los menores viajan bajo responsabilidad de un adulto acompañante.",
    "Consulta en oficina los requisitos para menores que viajan solos.",
  ]},
  { t: "6. Comprobante de pago", items: [
    "Emitimos boleta o factura electrónica según elijas al comprar.",
    "Para factura, ingresa el RUC y la razón social correctos.",
  ]},
];

export default function Clausulas() {
  return (
    <>
      <Header />
      <section className="section">
        <div className="wrap" style={{ maxWidth: "min(820px, 100%)" }}>
          <h1 style={{ fontSize: "clamp(28px,5vw,40px)", margin: "8px 0 10px" }}>Cláusulas del viaje</h1>
          <p className="muted" style={{ marginBottom: 30 }}>
            Al comprar un pasaje con {EMPRESA.nombre} aceptas las siguientes condiciones.
            Ante cualquier duda, escríbenos al {telefonoBonito}.
          </p>

          {CLAUSULAS.map((c) => (
            <div className="card" key={c.t} style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, marginBottom: 10 }}>{c.t}</h3>
              <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8 }}>
                {c.items.map((it, i) => <li key={i} className="muted" style={{ fontSize: 15 }}>{it}</li>)}
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
