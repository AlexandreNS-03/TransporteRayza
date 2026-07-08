import { useEffect, useState } from "react";
import "./Manifiesto.css";

function Manifiesto() {
    const [viajes, setViajes] = useState([]);
    const [viajeId, setViajeId] = useState("");
    const [cargandoViajes, setCargandoViajes] = useState(true);

    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => { fetchViajes(); }, []);
    useEffect(() => { if (viajeId) cargarManifiesto(); }, [viajeId]);

    const fetchViajes = async () => {
        setCargandoViajes(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("http://localhost:8080/api/viajes", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setViajes(data);
        } catch (e) {
            console.log(e);
        } finally {
            setCargandoViajes(false);
        }
    };

    const cargarManifiesto = async () => {
        setCargando(true);
        setError(null);
        setDatos(null);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `http://localhost:8080/api/ventas/manifiesto/${viajeId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res.ok) throw new Error("No se pudo cargar el manifiesto");

            const json = await res.json();
            setDatos(json);
        } catch (e) {
            console.log(e);
            setError(e.message);
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="manifiesto-container">

            {/* SELECTOR DE VIAJE */}
            <div className="manifiesto-selector">
                <label>Seleccionar Viaje</label>
                <select
                    value={viajeId}
                    onChange={e => setViajeId(e.target.value)}
                    disabled={cargandoViajes}
                >
                    <option value="">
                        {cargandoViajes ? "Cargando viajes..." : "Seleccionar viaje..."}
                    </option>
                    {viajes.map(v => (
                        <option key={v.id} value={v.id}>
                            {v.codigoViaje} — {v.rutaNombre} — {v.fechaSalida} {v.horaSalida}
                        </option>
                    ))}
                </select>
            </div>

            {!viajeId && (
                <div className="loading">Selecciona un viaje para ver su manifiesto</div>
            )}

            {cargando && (
                <div className="loading">Cargando manifiesto...</div>
            )}

            {error && !cargando && (
                <div className="loading">{error}</div>
            )}

            {/* DOCUMENTO */}
            {datos && !cargando && !error && (
                <>
                    <div className="acciones">
                        <button className="btn-imprimir" onClick={() => window.print()}>
                            🖨 Imprimir
                        </button>
                    </div>

                    <div className="documento">
                        <h1>TRANSPORTES RAYZA</h1>
                        <h2>MANIFIESTO DE PASAJEROS</h2>

                        <div className="cabecera">
                            <div><strong>Viaje:</strong> {datos.codigoViaje}</div>
                            <div><strong>Ruta:</strong> {datos.ruta}</div>
                            <div><strong>Embarcación:</strong> {datos.embarcacion}</div>
                            <div><strong>Fecha:</strong> {datos.fecha}</div>
                            <div><strong>Hora:</strong> {datos.hora}</div>
                            <div><strong>Total pasajeros:</strong> {datos.pasajeros.length}</div>
                        </div>

                        <table className="tabla-manifiesto">
                            <thead>
                            <tr>
                                <th>#</th>
                                <th>DNI</th>
                                <th>Nombre</th>
                                <th>Edad</th>
                                <th>Sexo</th>
                                <th>Asiento</th>
                                <th>Origen</th>
                                <th>Destino</th>
                                <th>Estado</th>
                            </tr>
                            </thead>
                            <tbody>
                            {datos.pasajeros.map((p, index) => (
                                <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td>{p.documento}</td>
                                    <td>{p.nombre}</td>
                                    <td>{p.edad}</td>
                                    <td>{p.sexo}</td>
                                    <td>{p.asiento}</td>
                                    <td>{p.origen}</td>
                                    <td>{p.destino}</td>
                                    <td>{p.estado}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>

                        <div className="firmas">
                            <div>_______________________<br/>Capitán</div>
                            <div>_______________________<br/>Supervisor</div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default Manifiesto;