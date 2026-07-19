import { useState, useEffect } from "react";
import "../Ventas/Pasajes.css";
import "../Finanzas/Comprobantes.css";
import { apiFetch } from "../../../Services/api.js";
import { usePaginacion, Paginacion } from "../../../Components/Paginacion.jsx";

const MODULOS = ["VENTAS", "COMPROBANTES", "USUARIOS", "CAJA", "GASTOS", "ENCOMIENDAS", "SOPORTE"];

const ACCION_BADGE = {
    CREAR: "badge-pagado", EMITIR: "badge-pagado", ABRIR: "badge-pagado", ACTIVAR: "badge-pagado",
    ANULAR: "badge-anulado", ELIMINAR: "badge-anulado", DESACTIVAR: "badge-anulado",
    NOTA_CREDITO: "badge-transito", CERRAR: "badge-transito", REPORTE: "badge-transito"
};

function fmtFecha(iso) {
    if (!iso) return "—";
    return iso.replace("T", " ").slice(0, 19);
}

function Auditorias() {
    const [registros, setRegistros] = useState([]);
    const [cargando, setCargando]   = useState(true);
    const [error, setError]         = useState(null);

    const [filtroModulo, setFiltroModulo] = useState("todos");
    const [busqueda, setBusqueda]         = useState("");
    const [fechaDesde, setFechaDesde]     = useState("");
    const [fechaHasta, setFechaHasta]     = useState("");

    useEffect(() => { cargar(); }, []);

    const cargar = async () => {
        setCargando(true);
        setError(null);
        try {
            setRegistros(await apiFetch("/api/auditoria"));
        } catch (err) { setError(err.message); }
        finally { setCargando(false); }
    };

    const filtrados = registros.filter(r => {
        if (filtroModulo !== "todos" && r.modulo !== filtroModulo) return false;
        const fecha = (r.createdAt || "").slice(0, 10);
        if (fechaDesde && fecha < fechaDesde) return false;
        if (fechaHasta && fecha > fechaHasta) return false;
        if (busqueda.trim()) {
            const q = busqueda.trim().toLowerCase();
            const coincide =
                (r.usuarioNombre || "").toLowerCase().includes(q) ||
                (r.accion || "").toLowerCase().includes(q) ||
                (r.descripcion || "").toLowerCase().includes(q);
            if (!coincide) return false;
        }
        return true;
    });

    const pag = usePaginacion(filtrados, 15);

    return (
        <div className="pasajes-page">

            <div className="pasajes-header">
                <div>
                    <h2>Auditoría</h2>
                    <p>Registro de acciones del sistema: quién hizo qué y cuándo</p>
                </div>
                <button className="btn-limpiar" onClick={cargar}>
                    <i className="ti ti-refresh"></i> Actualizar
                </button>
            </div>

            {/* FILTROS */}
            <div className="pasajes-filtros">
                <div className="filtro-grupo">
                    <label>Módulo</label>
                    <select value={filtroModulo} onChange={e => setFiltroModulo(e.target.value)}>
                        <option value="todos">Todos</option>
                        {MODULOS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div className="filtro-grupo">
                    <label>Desde</label>
                    <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
                </div>
                <div className="filtro-grupo">
                    <label>Hasta</label>
                    <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
                </div>
                <div className="filtro-grupo">
                    <label>Buscar</label>
                    <div className="filtro-buscar">
                        <i className="ti ti-search"></i>
                        <input type="text" placeholder="Usuario, acción, descripción..."
                               value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                    </div>
                </div>
                <button className="btn-limpiar" onClick={() => { setFiltroModulo("todos"); setBusqueda(""); setFechaDesde(""); setFechaHasta(""); }}>
                    <i className="ti ti-filter-off"></i> Limpiar
                </button>
            </div>

            {cargando && <div className="pasajes-estado"><i className="ti ti-loader-2 spin"></i> Cargando...</div>}
            {error && !cargando && <div className="pasajes-estado error"><i className="ti ti-alert-circle"></i> {error}</div>}

            {!cargando && !error && (
                <>
                <div className="pasajes-tabla-wrapper">
                    <table className="pasajes-tabla">
                        <thead>
                        <tr>
                            <th>Fecha / Hora</th>
                            <th>Usuario</th>
                            <th>Módulo</th>
                            <th>Acción</th>
                            <th>Descripción</th>
                        </tr>
                        </thead>
                        <tbody>
                        {pag.items.length === 0 ? (
                            <tr><td colSpan={5} className="tabla-vacia">
                                <i className="ti ti-clipboard-off"></i><span>Sin registros de auditoría</span>
                            </td></tr>
                        ) : (
                            pag.items.map(r => (
                                <tr key={r.id}>
                                    <td className="codigo">{fmtFecha(r.createdAt)}</td>
                                    <td>
                                        <div className="pasajero-info">
                                            <strong>{r.usuarioNombre || "—"}</strong>
                                            <span>{r.usuarioRol || ""}</span>
                                        </div>
                                    </td>
                                    <td><span className="comp-tipo boleta">{r.modulo}</span></td>
                                    <td>
                                        <span className={`badge ${ACCION_BADGE[r.accion] || "badge-pagado"}`}>
                                            {r.accion.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td>{r.descripcion}</td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
                <Paginacion {...pag} />
                </>
            )}
        </div>
    );
}

export default Auditorias;
