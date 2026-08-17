import { useState, useEffect } from "react";
import "./PreciosWeb.css";
import { motivoDelError } from "../../../Services/api.js";
import { useToast, Toasts } from "../../../Components/Toast.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

function PreciosWeb() {
    const [rutas, setRutas]         = useState([]);
    const [borradores, setBorradores] = useState({});   // { [rutaId]: { ofertaActiva, precioNormalOferta, precioVipOferta } }
    const [guardandoId, setGuardandoId] = useState(null);
    const [cargando, setCargando]   = useState(true);
    const [error, setError]         = useState(null);
    const { toasts, mostrarToast }  = useToast();

    useEffect(() => { fetchRutas(); }, []);

    const fetchRutas = async () => {
        setCargando(true);
        setError(null);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/rutas/activas`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(await motivoDelError(res, "Error al obtener rutas"));
            const data = await res.json();
            setRutas(data);
            setBorradores(Object.fromEntries(data.map(r => [r.id, {
                ofertaActiva: r.ofertaActiva || false,
                precioNormalOferta: r.precioNormalOferta ?? "",
                precioVipOferta: r.precioVipOferta ?? "",
            }])));
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    const cambiarBorrador = (rutaId, campo, valor) => {
        setBorradores(prev => ({ ...prev, [rutaId]: { ...prev[rutaId], [campo]: valor } }));
    };

    const guardar = async (rutaId) => {
        const b = borradores[rutaId];
        if (b.ofertaActiva && (b.precioNormalOferta === "" || b.precioVipOferta === "")) {
            mostrarToast("error", "Ingresa el precio normal y VIP de oferta antes de activarla");
            return;
        }
        setGuardandoId(rutaId);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/rutas/${rutaId}/precio-oferta`, {
                method: "PATCH",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    ofertaActiva: b.ofertaActiva,
                    precioNormalOferta: b.precioNormalOferta === "" ? null : parseFloat(b.precioNormalOferta),
                    precioVipOferta: b.precioVipOferta === "" ? null : parseFloat(b.precioVipOferta),
                })
            });
            if (!res.ok) throw new Error(await motivoDelError(res, "No se pudo guardar la oferta"));
            const actualizada = await res.json();
            setRutas(prev => prev.map(r => r.id === rutaId ? actualizada : r));
            mostrarToast("success", `Precio de ${b.ofertaActiva ? "oferta activado" : "oferta desactivado"} para ${actualizada.origen} → ${actualizada.destino}`);
        } catch (err) {
            mostrarToast("error", err.message);
        } finally {
            setGuardandoId(null);
        }
    };

    return (
        <div className="preciosweb-page">
            <Toasts toasts={toasts} />

            <div className="preciosweb-header">
                <div>
                    <h2>Precios Web</h2>
                    <p>Precio de oferta solo para la compra en línea — el mostrador sigue cobrando el precio normal</p>
                </div>
            </div>

            {cargando && (
                <div className="preciosweb-estado">
                    <i className="ti ti-loader-2 spin"></i>
                    <span>Cargando rutas...</span>
                </div>
            )}

            {error && !cargando && (
                <div className="preciosweb-estado error">
                    <i className="ti ti-alert-circle"></i>
                    <span>{error}</span>
                    <button onClick={fetchRutas}>Reintentar</button>
                </div>
            )}

            {!cargando && !error && (
                <div className="preciosweb-tabla-wrapper">
                    <table className="preciosweb-tabla">
                        <thead>
                        <tr>
                            <th>Ruta</th>
                            <th>Precio Normal</th>
                            <th>Precio VIP</th>
                            <th>En oferta</th>
                            <th>Oferta Normal</th>
                            <th>Oferta VIP</th>
                            <th>Acciones</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rutas.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="tabla-vacia">
                                    <i className="ti ti-route-off"></i>
                                    <span>No hay rutas activas</span>
                                </td>
                            </tr>
                        ) : (
                            rutas.map(r => {
                                const b = borradores[r.id] || {};
                                const cambio = b.ofertaActiva !== (r.ofertaActiva || false)
                                    || String(b.precioNormalOferta ?? "") !== String(r.precioNormalOferta ?? "")
                                    || String(b.precioVipOferta ?? "") !== String(r.precioVipOferta ?? "");
                                return (
                                    <tr key={r.id}>
                                        <td data-label="Ruta">
                                            <strong>{r.origen} → {r.destino}</strong>
                                            {r.ofertaActiva && <span className="badge badge-oferta">En oferta</span>}
                                        </td>
                                        <td data-label="Precio Normal">S/ {r.precioNormal}</td>
                                        <td data-label="Precio VIP">S/ {r.precioVip}</td>
                                        <td data-label="En oferta">
                                            <label className="switch">
                                                <input
                                                    type="checkbox"
                                                    checked={b.ofertaActiva || false}
                                                    onChange={e => cambiarBorrador(r.id, "ofertaActiva", e.target.checked)}
                                                />
                                                <span className="switch-track"></span>
                                            </label>
                                        </td>
                                        <td data-label="Oferta Normal">
                                            <input
                                                type="number" min="0" step="0.01" placeholder="S/"
                                                className="input-precio"
                                                value={b.precioNormalOferta ?? ""}
                                                onChange={e => cambiarBorrador(r.id, "precioNormalOferta", e.target.value)}
                                                disabled={!b.ofertaActiva}
                                            />
                                        </td>
                                        <td data-label="Oferta VIP">
                                            <input
                                                type="number" min="0" step="0.01" placeholder="S/"
                                                className="input-precio"
                                                value={b.precioVipOferta ?? ""}
                                                onChange={e => cambiarBorrador(r.id, "precioVipOferta", e.target.value)}
                                                disabled={!b.ofertaActiva}
                                            />
                                        </td>
                                        <td className="acciones" data-label="Acciones">
                                            <button
                                                className="btn-guardar-fila"
                                                onClick={() => guardar(r.id)}
                                                disabled={!cambio || guardandoId === r.id}
                                            >
                                                {guardandoId === r.id
                                                    ? <i className="ti ti-loader-2 spin"></i>
                                                    : <i className="ti ti-check"></i>}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default PreciosWeb;
