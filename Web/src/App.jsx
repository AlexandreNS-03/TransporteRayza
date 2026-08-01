import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Comprar from "./pages/Comprar";
import Ingresar from "./pages/Ingresar";
import Historial from "./pages/Historial";
import Servicios from "./pages/Servicios";
import Clausulas from "./pages/Clausulas";
import Privacidad from "./pages/Privacidad";
import Contacto from "./pages/Contacto";
import MiCuenta from "./pages/MiCuenta";
import Destinos from "./pages/Destinos";
import DestinoDetalle from "./pages/DestinoDetalle";
import CookieBanner from "./components/CookieBanner";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/comprar" element={<Comprar />} />
        <Route path="/ingresar" element={<Ingresar />} />
        <Route path="/mi-cuenta" element={<MiCuenta />} />
        <Route path="/historial" element={<Historial />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/clausulas" element={<Clausulas />} />
        <Route path="/privacidad" element={<Privacidad />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/destinos" element={<Destinos />} />
        <Route path="/destinos/:slug" element={<DestinoDetalle />} />
        <Route path="*" element={<Landing />} />
      </Routes>
      <CookieBanner />
    </BrowserRouter>
  );
}
