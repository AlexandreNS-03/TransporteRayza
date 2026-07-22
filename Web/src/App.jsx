import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Comprar from "./pages/Comprar";
import Ingresar from "./pages/Ingresar";
import MiCuenta from "./pages/MiCuenta";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/comprar" element={<Comprar />} />
        <Route path="/ingresar" element={<Ingresar />} />
        <Route path="/mi-cuenta" element={<MiCuenta />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  );
}
