import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import AvisoCorreoSinVerificar from "./AvisoCorreoSinVerificar";
import "./CuentaLayout.css";
import {
  IconPanel, IconBoat, IconRecibo, IconUsuario, IconIdentidad,
  IconPersonas, IconWallet, IconCampana, IconAyuda, IconSalir,
} from "./Icons";
import { estaLogueado, clienteActual, cerrarSesion, getPerfil } from "../services/authCliente";

/**
 * El marco de la cuenta: identidad, menú lateral y salida.
 *
 * <p>Antes el menú eran nueve pastillas en fila. Con nueve ya no entraban en
 * una línea, así que se partían en dos y la que estaba activa cambiaba de lugar
 * según el ancho de la ventana: para saber dónde estabas había que leerlas
 * todas. Una lista vertical no se desordena al crecer, y cada sección ocupa
 * siempre el mismo lugar.
 *
 * <p><strong>Y van agrupadas, que es lo que de verdad ordena.</strong> Nueve
 * cosas sueltas se leen una por una; tres grupos de tres se leen de un vistazo,
 * porque la pregunta "¿dónde estará esto?" se contesta antes de mirar los
 * nombres: lo del viaje con lo del viaje, lo mío con lo mío.
 *
 * <p>En el teléfono la lista entera arriba empujaría el contenido fuera de la
 * pantalla, así que se pliega y el botón dice en qué sección estás.
 */

const GRUPOS = [
  {
    titulo: "Tus viajes",
    items: [
      { ruta: "/mi-cuenta", nombre: "Resumen", icono: IconPanel, exacta: true },
      { ruta: "/mi-cuenta/viajes", nombre: "Mis viajes", icono: IconBoat },
      { ruta: "/mi-cuenta/comprobantes", nombre: "Boletas y facturas", icono: IconRecibo },
    ],
  },
  {
    titulo: "Tus datos",
    items: [
      { ruta: "/mi-cuenta/perfil", nombre: "Datos personales", icono: IconUsuario },
      { ruta: "/mi-cuenta/documentos", nombre: "Documentos de viaje", icono: IconIdentidad },
      { ruta: "/mi-cuenta/acompanantes", nombre: "Acompañantes", icono: IconPersonas },
    ],
  },
  {
    titulo: "Tu cuenta",
    items: [
      { ruta: "/mi-cuenta/pagos", nombre: "Formas de pago", icono: IconWallet },
      { ruta: "/mi-cuenta/notificaciones", nombre: "Notificaciones", icono: IconCampana },
      { ruta: "/mi-cuenta/ayuda", nombre: "Ayuda", icono: IconAyuda },
    ],
  },
];

const TODAS = GRUPOS.flatMap((g) => g.items);

export default function CuentaLayout({ titulo, children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [perfil, setPerfil] = useState(clienteActual());
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    if (!estaLogueado()) {
      navigate("/ingresar?next=" + encodeURIComponent(window.location.pathname));
      return;
    }
    getPerfil().then(setPerfil).catch(() => {});
  }, [navigate]);

  // Al cambiar de sección el menú del teléfono se cierra solo: dejarlo abierto
  // taparía justo lo que la persona acaba de abrir.
  useEffect(() => { setMenuAbierto(false); }, [pathname]);

  const salir = () => { cerrarSesion(); navigate("/"); };

  if (!perfil) return null;

  const actual = TODAS.find((i) => (i.exacta ? pathname === i.ruta : pathname.startsWith(i.ruta)));
  const nombre = [perfil.nombres, perfil.apellidos].filter(Boolean).join(" ").trim();

  return (
    <>
      <Header />

      <section className="cuenta">
        <div className="wrap cuenta-grid">

          {/* ── Quién sos ── */}
          {/* Arriba de la barra y no en el contenido: es lo que confirma de un
              vistazo que estás en TU cuenta, y no cambia al navegar. */}
          <aside className="cuenta-lateral">
            <div className="cuenta-yo">
              <span className="cuenta-inicial" aria-hidden="true">
                {(perfil.nombres || "V").trim().charAt(0).toUpperCase()}
              </span>
              <div className="cuenta-yo-texto">
                <strong>{nombre || "Viajero"}</strong>
                <span>{perfil.email}</span>
              </div>
            </div>

            {/* En el teléfono esto abre y cierra la lista; en pantalla grande
                no se muestra y la lista está siempre abierta. */}
            <button
              type="button"
              className="cuenta-abrir"
              aria-expanded={menuAbierto}
              aria-controls="cuenta-secciones"
              onClick={() => setMenuAbierto((v) => !v)}>
              <span>{actual ? actual.nombre : "Secciones"}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                   className={menuAbierto ? "girada" : undefined}>
                <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <nav
              id="cuenta-secciones"
              className={`cuenta-nav ${menuAbierto ? "abierta" : ""}`}
              aria-label="Secciones de mi cuenta">
              {GRUPOS.map((grupo) => (
                <div className="cuenta-grupo" key={grupo.titulo}>
                  <h2 className="cuenta-grupo-tit">{grupo.titulo}</h2>
                  <ul>
                    {grupo.items.map(({ ruta, nombre: etiqueta, icono: Icono, exacta }) => (
                      <li key={ruta}>
                        <NavLink
                          to={ruta}
                          end={!!exacta}
                          className={({ isActive }) => `cuenta-enlace ${isActive ? "activo" : ""}`}>
                          <Icono className="cuenta-enlace-ico" aria-hidden="true" />
                          <span>{etiqueta}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <button type="button" className="cuenta-enlace cuenta-salir" onClick={salir}>
                <IconSalir className="cuenta-enlace-ico" aria-hidden="true" />
                <span>Cerrar sesión</span>
              </button>
            </nav>
          </aside>

          {/* ── La sección ── */}
          <main className="cuenta-contenido">
            {/* El aviso del correo va en el marco y no en una página: mientras
                no esté confirmado, el boleto puede estar llegando a otra
                bandeja, y eso hay que verlo desde cualquier sección. */}
            <AvisoCorreoSinVerificar perfil={perfil} onVerificado={setPerfil} />

            {titulo && <h1 className="cuenta-titulo">{titulo}</h1>}
            {typeof children === "function" ? children(perfil, setPerfil) : children}
          </main>
        </div>
      </section>

      <Footer />
    </>
  );
}
