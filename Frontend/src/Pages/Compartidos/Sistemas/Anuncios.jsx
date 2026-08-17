import { useState, useEffect } from "react";
import "./Anuncios.css";
import { motivoDelError } from "../../../Services/api.js";
import { useToast, Toasts } from "../../../Components/Toast.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

const TIPO_LABEL = { BARRA: "Barra superior", MODAL: "Ventana emergente", LANDING: "Tarjeta en el inicio" };

function Anuncios() {
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    const esAdmin = usuario?.rol === "ADMIN";

    const [anuncios, setAnuncios]   = useState([]);
    const [cargando, setCargando]   = useState(true);
    const [error, setError]         = useState(null);
    const { toasts, mostrarToast }  = useToast();

    // Filtros
    const [tipoFiltro, setTipoFiltro] = useState("todos");

    // Modal
    const [modalAbierto, setModalAbierto] = useState(false);
    const [modoEditar, setModoEditar]     = useState(false);
    const [seleccionado, setSeleccionado] = useState(null);
    const [guardando, setGuardando]       = useState(false);
    const [errorModal, setErrorModal]     = useState(null);

    const formVacio = {
        titulo: "", mensaje: "", tipo: "BARRA", textoEnlace: "", urlEnlace: "",
        activo: true, fechaInicio: "", fechaFin: ""
    };
    const [form, setForm] = useState(formVacio);

    useEffect(() => { fetchAnuncios(); }, []);

    const fetchAnuncios = async () => {
        setCargando(true);
        setError(null);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/anuncios`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(await motivoDelError(res, "Error al obtener anuncios"));
            setAnuncios(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    const abrirModalCrear = () => {
        setForm(formVacio);
        setModoEditar(false);
        setSeleccionado(null);
        setErrorModal(null);
        setModalAbierto(true);
    };

    const abrirModalEditar = (a) => {
        setForm({
            titulo: a.titulo, mensaje: a.mensaje, tipo: a.tipo,
            textoEnlace: a.textoEnlace || "", urlEnlace: a.urlEnlace || "",
            activo: a.activo, fechaInicio: a.fechaInicio || "", fechaFin: a.fechaFin || ""
        });
        setModoEditar(true);
        setSeleccionado(a);
        setErrorModal(null);
        setModalAbierto(true);
    };

    const cerrarModal = () => {
        setModalAbierto(false);
        setSeleccionado(null);
        setErrorModal(null);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };

    const guardar = async () => {
        if (!form.titulo || !form.mensaje) {
            setErrorModal("Título y mensaje son obligatorios");
            return;
        }
        setGuardando(true);
        setErrorModal(null);
        try {
            const token = localStorage.getItem("token");
            const url = modoEditar
                ? `${API_BASE}/api/anuncios/${seleccionado.id}`
                : `${API_BASE}/api/anuncios`;
            const method = modoEditar ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });

            if (!res.ok) throw new Error(await motivoDelError(res, "Error al guardar el anuncio"));
            cerrarModal();
            fetchAnuncios();
        } catch (err) {
            setErrorModal(err.message);
        } finally {
            setGuardando(false);
        }
    };

    const toggleActivo = async (a) => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/anuncios/${a.id}`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    titulo: a.titulo, mensaje: a.mensaje, tipo: a.tipo,
                    textoEnlace: a.textoEnlace, urlEnlace: a.urlEnlace,
                    activo: !a.activo, fechaInicio: a.fechaInicio, fechaFin: a.fechaFin
                })
            });
            if (!res.ok) throw new Error(await motivoDelError(res, "No se pudo cambiar el estado del anuncio"));
            fetchAnuncios();
        } catch (err) {
            mostrarToast("error", err.message);
        }
    };

    const anunciosFiltrados = anuncios.filter(a => tipoFiltro === "todos" || a.tipo === tipoFiltro);

    return (
        <div className="anuncios-page">
            <Toasts toasts={toasts} />

            <div className="anuncios-header">
                <div>
                    <h2>Anuncios</h2>
                    <p>Barra, ventana emergente y tarjetas de la web pública</p>
                </div>
                {esAdmin && (
                    <button className="btn-nuevo" onClick={abrirModalCrear}>
                        <i className="ti ti-plus"></i> Nuevo Anuncio
                    </button>
                )}
            </div>

            <div className="anuncios-filtros">
                <div className="filtro-grupo">
                    <label>Tipo</label>
                    <select value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}>
                        <option value="todos">Todos</option>
                        <option value="BARRA">Barra superior</option>
                        <option value="MODAL">Ventana emergente</option>
                        <option value="LANDING">Tarjeta en el inicio</option>
                    </select>
                </div>
            </div>

            {cargando && (
                <div className="anuncios-estado">
                    <i className="ti ti-loader-2 spin"></i>
                    <span>Cargando anuncios...</span>
                </div>
            )}

            {error && !cargando && (
                <div className="anuncios-estado error">
                    <i className="ti ti-alert-circle"></i>
                    <span>{error}</span>
                    <button onClick={fetchAnuncios}>Reintentar</button>
                </div>
            )}

            {!cargando && !error && (
                <div className="anuncios-tabla-wrapper">
                    <table className="anuncios-tabla">
                        <thead>
                        <tr>
                            <th>Título</th>
                            <th>Tipo</th>
                            <th>Vigencia</th>
                            <th>Estado</th>
                            {esAdmin && <th>Acciones</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {anunciosFiltrados.length === 0 ? (
                            <tr>
                                <td colSpan={esAdmin ? 5 : 4} className="tabla-vacia">
                                    <i className="ti ti-speakerphone"></i>
                                    <span>No hay anuncios creados</span>
                                </td>
                            </tr>
                        ) : (
                            anunciosFiltrados.map(a => (
                                <tr key={a.id}>
                                    <td data-label="Título">
                                        <strong>{a.titulo}</strong>
                                        <div className="anuncio-mensaje-preview">{a.mensaje}</div>
                                    </td>
                                    <td data-label="Tipo">{TIPO_LABEL[a.tipo] || a.tipo}</td>
                                    <td data-label="Vigencia">
                                        {a.fechaInicio || a.fechaFin
                                            ? `${a.fechaInicio || "—"} a ${a.fechaFin || "—"}`
                                            : "Sin límite"}
                                    </td>
                                    <td data-label="Estado">
                                        <span className={a.activo ? "badge badge-activo" : "badge badge-inactivo"}>
                                            {a.activo ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>
                                    {esAdmin && (
                                        <td className="acciones" data-label="Acciones">
                                            <button className="btn-accion editar" onClick={() => abrirModalEditar(a)}>
                                                <i className="ti ti-pencil"></i>
                                            </button>
                                            <button
                                                className={`btn-accion ${a.activo ? "desactivar" : "activar"}`}
                                                onClick={() => toggleActivo(a)}
                                                title={a.activo ? "Desactivar" : "Activar"}
                                            >
                                                <i className={`ti ${a.activo ? "ti-toggle-right" : "ti-toggle-left"}`}></i>
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            )}

            {modalAbierto && (
                <div className="modal-overlay" onClick={cerrarModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>

                        <div className="modal-header">
                            <h3>{modoEditar ? "Editar Anuncio" : "Nuevo Anuncio"}</h3>
                            <button className="modal-cerrar" onClick={cerrarModal}>
                                <i className="ti ti-x"></i>
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="form-grupo">
                                <label>Tipo *</label>
                                <select name="tipo" value={form.tipo} onChange={handleChange}>
                                    <option value="BARRA">Barra superior (arriba del header)</option>
                                    <option value="MODAL">Ventana emergente (una vez por visita)</option>
                                    <option value="LANDING">Tarjeta en el inicio</option>
                                </select>
                            </div>

                            <div className="form-grupo">
                                <label>Título *</label>
                                <input type="text" name="titulo" value={form.titulo} onChange={handleChange}
                                       placeholder="Ej: Oferta de fin de semana" />
                            </div>

                            <div className="form-grupo">
                                <label>Mensaje *</label>
                                <textarea name="mensaje" value={form.mensaje} onChange={handleChange} rows={3}
                                          placeholder="Ej: 20% de descuento en la ruta Requena-Iquitos, solo este fin de semana." />
                            </div>

                            <div className="form-fila">
                                <div className="form-grupo">
                                    <label>Texto del enlace</label>
                                    <input type="text" name="textoEnlace" value={form.textoEnlace} onChange={handleChange}
                                           placeholder="Ej: Comprar ahora" />
                                </div>
                                <div className="form-grupo">
                                    <label>URL del enlace</label>
                                    <input type="text" name="urlEnlace" value={form.urlEnlace} onChange={handleChange}
                                           placeholder="Ej: /comprar" />
                                </div>
                            </div>

                            <div className="form-fila">
                                <div className="form-grupo">
                                    <label>Desde (opcional)</label>
                                    <input type="date" name="fechaInicio" value={form.fechaInicio} onChange={handleChange} />
                                </div>
                                <div className="form-grupo">
                                    <label>Hasta (opcional)</label>
                                    <input type="date" name="fechaFin" value={form.fechaFin} onChange={handleChange} />
                                </div>
                            </div>
                            <span className="form-hint">Sin fechas, el anuncio queda vigente mientras esté activo.</span>

                            <div className="form-grupo-check">
                                <input type="checkbox" name="activo" id="anuncio-activo"
                                       checked={form.activo} onChange={handleChange} />
                                <label htmlFor="anuncio-activo">Anuncio activo</label>
                            </div>

                            {errorModal && (
                                <div className="modal-error">
                                    <i className="ti ti-alert-circle"></i>
                                    {errorModal}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
                            <button className="btn-guardar" onClick={guardar} disabled={guardando}>
                                {guardando
                                    ? <><i className="ti ti-loader-2 spin"></i> Guardando...</>
                                    : <><i className="ti ti-check"></i> {modoEditar ? "Actualizar" : "Guardar"}</>
                                }
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

export default Anuncios;
