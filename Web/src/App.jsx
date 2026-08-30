import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import IrArriba from "./components/IrArriba";
import Seo from "./components/Seo";
import CookieBanner from "./components/CookieBanner";

/**
 * El inicio se carga de una, porque es lo primero que ve todo el mundo. El resto
 * de páginas se descarga recién cuando alguien entra en ellas.
 *
 * Importa bastante acá: los clientes entran desde el celular con datos que en la
 * región se pagan caro, y antes se les mandaba de golpe el generador de PDF y el
 * lector de QR aunque solo fueran a mirar los horarios.
 */
const Comprar        = lazy(() => import("./pages/Comprar"));
const Ingresar       = lazy(() => import("./pages/Ingresar"));
const MiCuenta       = lazy(() => import("./pages/MiCuenta"));
const Historial      = lazy(() => import("./pages/Historial"));
const Servicios      = lazy(() => import("./pages/Servicios"));
const Clausulas      = lazy(() => import("./pages/Clausulas"));
const Privacidad     = lazy(() => import("./pages/Privacidad"));
const LibroReclamaciones = lazy(() => import("./pages/LibroReclamaciones"));
const RecuperarClave     = lazy(() => import("./pages/RecuperarClave"));
const Sorteo             = lazy(() => import("./pages/Sorteo"));
const Contacto       = lazy(() => import("./pages/Contacto"));
const Destinos       = lazy(() => import("./pages/Destinos"));
const DestinoDetalle = lazy(() => import("./pages/DestinoDetalle"));
const Rastreo        = lazy(() => import("./pages/Rastreo"));
const PagaCarga      = lazy(() => import("./pages/PagaCarga"));
const PagarReserva   = lazy(() => import("./pages/PagarReserva"));

/** Lo que se ve el instante que tarda en llegar la página. */
function Cargando() {
  return (
    <div className="pagina-cargando">
      <span className="cargando-giro" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Seo />
      <IrArriba />
      <Suspense fallback={<Cargando />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/comprar" element={<Comprar />} />
          <Route path="/ingresar" element={<Ingresar />} />
          <Route path="/mi-cuenta" element={<MiCuenta />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/servicios" element={<Servicios />} />
          <Route path="/clausulas" element={<Clausulas />} />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="/libro-de-reclamaciones" element={<LibroReclamaciones />} />
          {/* Las dos rutas llevan a la misma pantalla: sin token pide el enlace,
              con token deja elegir la contraseña nueva. */}
          <Route path="/olvide-mi-clave" element={<RecuperarClave />} />
          <Route path="/restablecer" element={<RecuperarClave />} />
          <Route path="/sorteo" element={<Sorteo />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/destinos" element={<Destinos />} />
          <Route path="/destinos/:slug" element={<DestinoDetalle />} />
          <Route path="/rastreo" element={<Rastreo />} />
          <Route path="/paga-tu-carga" element={<PagaCarga />} />
          {/* Enlace del correo de "tu reserva tiene un pago pendiente" */}
          <Route path="/pagar-reserva" element={<PagarReserva />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </Suspense>
      <CookieBanner />
    </BrowserRouter>
  );
}
