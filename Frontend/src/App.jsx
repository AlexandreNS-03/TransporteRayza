import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import AdminDashboard from "./Pages/Admin/AdminDashboard.jsx";
import SupervisorDashboard from "./Pages/Supervisor/SupervisorDashboard.jsx";
import EmpleadoDashboard from "./Pages/Empleado/EmpleadoDashboard.jsx";
import PrivateRoute from "./Router/PrivateRoute";

//ADMINISTRACION

import Sucursales from "./Pages/Compartidos/Administracion/Sucursales.jsx";
import Viajes from "./Pages/Compartidos/Operaciones/Viajes.jsx";
import Rutas from "./Pages/Compartidos/Administracion/Rutas.jsx"
import Manifiesto from "./Pages/Compartidos/Operaciones/Manifesto.jsx";
import Embarque from "./Pages/Compartidos/Operaciones/Embarque.jsx";
import Embarcaciones from "./Pages/Compartidos/Administracion/Embarcaciones.jsx";
import Paradas from "./Pages/Compartidos/Operaciones/Paradas.jsx";
import Pasajes from "./Pages/Compartidos/Ventas/Pasajes.jsx";
import Dashboard from "./Pages/Compartidos/Sistemas/Dashboard.jsx";
import Roles from "./Pages/Compartidos/Sistemas/RolesPermisos.jsx";
import Reportes from "./Pages/Compartidos/Sistemas/Reportes.jsx";
import Comprobantes from "./Pages/Compartidos/Finanzas/Comprobantes.jsx";
import Cajas from "./Pages/Compartidos/Finanzas/Cajas.jsx";
import Encomiendas from "./Pages/Compartidos/Ventas/Encomiendas.jsx";
import Auditorias from "./Pages/Compartidos/Sistemas/Auditorias.jsx";
import Soporte from "./Pages/Compartidos/Sistemas/Soporte.jsx";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                <Route path="/" element={<Login />} />

                <Route
                    path="/admin"
                    element={
                        <PrivateRoute rolPermitido="ADMIN">
                            <AdminDashboard />
                        </PrivateRoute>
                    }
                >
                    <Route path="viajes" element={<Viajes />} />
                    <Route path="sucursales" element={<Sucursales />} />
                    <Route path="rutas" element={<Rutas />} />
                    <Route path="embarque" element={<Embarque />} />
                    <Route path="embarcaciones" element={<Embarcaciones />} />
                    <Route path="pasajes" element={<Pasajes />} />
                    <Route path="encomiendas" element={<Encomiendas />} />
                    <Route path="soporte" element={<Soporte />} />
                    <Route path="paradas" element={<Paradas />} />
                    <Route path="caja" element={<Cajas />} />
                    <Route path="comprobantes" element={<Comprobantes />} />
                    <Route index element={<Dashboard />} />
                    <Route  path="roles" element={<Roles />} />
                    <Route  path="reportes" element={<Reportes />} />
                    <Route path="manifiesto" element={<Manifiesto />} />
                    <Route path="auditoria" element={<Auditorias />} />
                </Route>

                <Route
                    path="/supervisor"
                    element={
                        <PrivateRoute rolPermitido="SUPERVISOR">
                            <SupervisorDashboard />
                        </PrivateRoute>
                    }
                >
                    <Route path="viajes" element={<Viajes />} />
                    <Route path="sucursales" element={<Sucursales />} />
                    <Route path="rutas" element={<Rutas />} />
                    <Route path="embarque" element={<Embarque />} />
                    <Route path="embarcaciones" element={<Embarcaciones />} />
                    <Route path="pasajes" element={<Pasajes />} />
                    <Route path="encomiendas" element={<Encomiendas />} />
                    <Route path="soporte" element={<Soporte />} />
                    <Route path="paradas" element={<Paradas />} />
                    <Route path="caja" element={<Cajas />} />
                    <Route path="comprobantes" element={<Comprobantes />} />
                    <Route index element={<Dashboard />} />
                    <Route  path="roles" element={<Roles />} />
                    <Route  path="reportes" element={<Reportes />} />
                    <Route  path="manifiesto" element={<Manifiesto />} />
                </Route>

                {/* EMPLEADO con rutas hijas */}
                <Route
                    path="/empleado"
                    element={
                        <PrivateRoute rolPermitido="EMPLEADO">
                            <EmpleadoDashboard />
                        </PrivateRoute>
                    }
                >
                    <Route path="viajes" element={<Viajes />} />
                    <Route path="sucursales" element={<Sucursales />} />
                    <Route path="rutas" element={<Rutas />} />
                    <Route path="pasajes" element={<Pasajes />} />
                    <Route path="encomiendas" element={<Encomiendas />} />
                    <Route path="soporte" element={<Soporte />} />
                    <Route path="paradas" element={<Paradas />} />
                    <Route path="caja" element={<Cajas />} />
                    <Route path="comprobantes" element={<Comprobantes />} />
                    <Route index element={<Dashboard />} />
                    <Route  path="roles" element={<Roles />} />
                    <Route  path="reportes" element={<Reportes />} />
                    <Route  path="manifiesto" element={<Manifiesto />} />
                </Route>

            </Routes>
        </BrowserRouter>
    );
}

export default App;