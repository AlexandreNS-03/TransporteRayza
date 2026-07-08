import { useState, useEffect } from "react";
import "./Pasajes.css";
import generarComprobante from "../../../Utils/generarComprobante.jsx";


const API = "http://localhost:8080";

const TIPO_DOC     = ["DNI", "CE", "PASAPORTE", "RUC"];
const SEXO         = ["Masculino", "Femenino", "Otro"];
const COMPROBANTES = ["TICKET", "BOLETA", "FACTURA"];
const COMP_LABEL   = { TICKET: "Ticket", BOLETA: "Boleta", FACTURA: "Factura" };

const ESTADO_LABEL = { PAGADO: "Pagado", ANULADO: "Anulado" };

function badgeEstado(estado) {
    return estado === "PAGADO" ? "badge badge-pagado" : "badge badge-anulado";
}

function token() { return localStorage.getItem("token"); }

async function apiFetch(url, opts = {}) {
    const res = await fetch(`${API}${url}`, {
        ...opts,
        headers: { "Authorization": `Bearer ${token()}`, "Content-Type": "application/json", ...opts.headers }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

function Pasajes() {
    const usuario      = JSON.parse(localStorage.getItem("usuario"));
    const esAdmin      = usuario?.rol === "ADMIN";
    const esSupervisor = usuario?.rol === "SUPERVISOR";
    const puedeVender  = esAdmin || esSupervisor;

    // Lista ventas
    const [ventas, setVentas]         = useState([]);
    const [cargando, setCargando]     = useState(true);
    const [error, setError]           = useState(null);
    const [busqueda, setBusqueda]     = useState("");
    const [filtroEstado, setFiltro]   = useState("todos");

    // Modal wizard
    const [modalAbierto, setModal]    = useState(false);
    const [paso, setPaso]             = useState(1);
    const [guardando, setGuardando]   = useState(false);
    const [errorModal, setErrorModal] = useState(null);

    // Datos para selects
    const [viajes, setViajes]         = useState([]);
    const [paradas, setParadas]       = useState([]);
    const [asientos, setAsientos]     = useState([]);
    const [tarifa, setTarifa]         = useState(null);

    // Formulario
    const [form, setForm] = useState({
        // Paso 1
        viajeId: "",
        // Paso 2
        tipoDocumento: "DNI", pasajeroNombre: "", pasajeroDocumento: "",
        procedencia: "", pasajeroTelefono: "", edad: "", sexo: "Masculino", clienteEmail: "",
        // Paso 3
        paradaOrigen: "", paradaDestino: "", ordenOrigen: "", ordenDestino: "",
        // Paso 4
        asientoNumero: "", asientoTipo: "",
        // Paso 5
        tipoComprobante: "TICKET",
        clienteNombre: "", clienteTipoDoc: "DNI",
        clienteDocumento: "", detalleComprobante: "",
        precio: ""
    });

    useEffect(() => { fetchVentas(); }, []);

    const fetchVentas = async () => {
        setCargando(true);
        setError(null);
        try {
            const data = await apiFetch("/api/ventas");
            setVentas(data);
        } catch (err) { setError(err.message); }
        finally { setCargando(false); }
    };

    // Abrir modal
    const abrirModal = async () => {
        resetForm();
        try {
            const data = await apiFetch("/api/viajes");
            setViajes(data.filter(v => v.estado === "PROGRAMADO"));
        } catch (err) { console.error(err); }
        setModal(true);
    };

    const resetForm = () => {
        setPaso(1);
        setErrorModal(null);
        setParadas([]);
        setAsientos([]);
        setTarifa(null);
        setForm({
            viajeId: "", tipoDocumento: "DNI", pasajeroNombre: "",
            pasajeroDocumento: "", procedencia: "", pasajeroTelefono: "",
            edad: "", sexo: "Masculino", clienteEmail:"",
            paradaOrigen: "", paradaDestino: "", ordenOrigen: "", ordenDestino: "",
            asientoNumero: "", asientoTipo: "",
            tipoComprobante: "TICKET", clienteNombre: "", clienteTipoDoc: "DNI",
            clienteDocumento: "", detalleComprobante: "", precio: ""
        });
    };

    const cerrarModal = () => { setModal(false); resetForm(); };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const enviarCorreo = async (id) => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`http://localhost:8080/api/ventas/${id}/enviar-comprobante`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error();
            alert("Comprobante enviado exitosamente");
        } catch (err) {
            alert("Error al enviar el comprobante");
        }
    };

    // ── PASO 1: seleccionar viaje ──
    const confirmarViaje = async () => {
        if (!form.viajeId) { setErrorModal("Selecciona un viaje"); return; }
        const viaje = viajes.find(v => v.id === form.viajeId);
        try {
            const data = await apiFetch(`/api/rutas/${viaje.rutaId}`);
            setParadas(data.paradas || []);
            setErrorModal(null);
            setPaso(2);
        } catch (err) { setErrorModal("Error al cargar paradas del viaje"); }
    };

    // ── PASO 2: datos pasajero ──
    const confirmarPasajero = () => {
        if (!form.pasajeroNombre || !form.pasajeroDocumento) {
            setErrorModal("Nombre y documento son obligatorios");
            return;
        }
        // Copiar nombre al cliente por defecto
        setForm(prev => ({ ...prev, clienteNombre: prev.pasajeroNombre, clienteDocumento: prev.pasajeroDocumento }));
        setErrorModal(null);
        setPaso(3);
    };

    // ── PASO 3: seleccionar tramo ──
    const confirmarTramo = async () => {
        if (!form.paradaOrigen || !form.paradaDestino) {
            setErrorModal("Selecciona origen y destino");
            return;
        }
        if (form.ordenOrigen >= form.ordenDestino) {
            setErrorModal("El destino debe ser posterior al origen");
            return;
        }
        const viaje = viajes.find(v => v.id === form.viajeId);
        try {
            const todosAsientos = await apiFetch(`/api/viajes/${form.viajeId}/asientos`);

            const asientosLibres = await apiFetch(
                `/api/viajes/${form.viajeId}/asientos/libres?ordenOrigen=${form.ordenOrigen}&ordenDestino=${form.ordenDestino}`
            );

            const libresIds = new Set(asientosLibres.map(a => a.id));
            const asientosConEstado = todosAsientos.map(a => ({
                ...a,
                libreParaTramo: libresIds.has(a.id)
            }));

            setAsientos(asientosConEstado);  // ← solo esta línea

            const t = await apiFetch(
                `/api/rutas/${viaje.rutaId}/tarifa?ordenOrigen=${form.ordenOrigen}&ordenDestino=${form.ordenDestino}`
            );
            setTarifa(t);
            setErrorModal(null);
            setPaso(4);
        } catch (err) { setErrorModal("Error al cargar asientos o tarifas"); }
    };

    // ── PASO 4: seleccionar asiento ──
    const seleccionarAsiento = (asiento) => {
        setForm(prev => ({
            ...prev,
            asientoNumero: asiento.numero,
            asientoTipo: asiento.tipo,
            precio: asiento.tipo === "VIP" ? tarifa?.precioVip : tarifa?.precioNormal
        }));
    };

    const confirmarAsiento = () => {
        if (!form.asientoNumero) { setErrorModal("Selecciona un asiento"); return; }
        setErrorModal(null);
        setPaso(5);
    };

    // ── PASO 5: comprobante ──
    const confirmarVenta = async () => {
        if (!form.clienteNombre || !form.clienteDocumento) {
            setErrorModal("Datos del comprobante son obligatorios");
            return;
        }
        setGuardando(true);
        setErrorModal(null);
        try {
            await apiFetch("/api/ventas", {
                method: "POST",
                body: JSON.stringify({
                    viajeId:           form.viajeId,
                    tipoDocumento:     form.tipoDocumento,
                    pasajeroNombre:    form.pasajeroNombre,
                    pasajeroDocumento: form.pasajeroDocumento,
                    procedencia:       form.procedencia,
                    pasajeroTelefono:  form.pasajeroTelefono,
                    clienteEmail:      form.clienteEmail,
                    edad:              parseInt(form.edad) || null,
                    sexo:              form.sexo,
                    tipoComprobante:   form.tipoComprobante,
                    clienteNombre:     form.clienteNombre,
                    clienteTipoDoc:    form.clienteTipoDoc,
                    clienteDocumento:  form.clienteDocumento,
                    detalleComprobante: form.detalleComprobante,
                    asientoNumero:     form.asientoNumero,
                    asientoTipo:       form.asientoTipo,
                    paradaOrigen:      form.paradaOrigen,
                    paradaDestino:     form.paradaDestino,
                    ordenOrigen:       parseInt(form.ordenOrigen),
                    ordenDestino:      parseInt(form.ordenDestino),
                    precio:            parseFloat(form.precio)
                })
            });
            cerrarModal();
            fetchVentas();
        } catch (err) { setErrorModal("Error al registrar la venta"); }
        finally { setGuardando(false); }
    };

    // Anular venta
    const anularVenta = async (id) => {
        if (!confirm("¿Confirmas anular esta venta?")) return;
        try {
            await apiFetch(`/api/ventas/${id}/anular`, { method: "PATCH" });
            fetchVentas();
        } catch (err) { alert("Error al anular la venta"); }
    };

    // Buscar por documento
    const buscarPorDoc = async () => {
        if (!busqueda.trim()) { fetchVentas(); return; }
        setCargando(true);
        try {
            const data = await apiFetch(`/api/ventas/documento/${busqueda.trim()}`);
            setVentas(data);
        } catch (err) { setError("No se encontraron ventas"); }
        finally { setCargando(false); }
    };

    const ventasFiltradas = ventas.filter(v => {
        if (filtroEstado === "pagado"  && v.estado !== "PAGADO")  return false;
        if (filtroEstado === "anulado" && v.estado !== "ANULADO") return false;
        return true;
    });

    const viajeSeleccionado = viajes.find(v => v.id === form.viajeId);

    const chunkArray = (arr, size) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    };

    return (
        <div className="pasajes-page">

            {/* ENCABEZADO */}
            <div className="pasajes-header">
                <div>
                    <h2>Pasajes</h2>
                    <p>Venta y gestión de pasajes fluviales</p>
                </div>
                {puedeVender && (
                    <button className="btn-nuevo" onClick={abrirModal}>
                        <i className="ti ti-plus"></i> Nuevo Pasaje
                    </button>
                )}
            </div>

            {/* FILTROS */}
            <div className="pasajes-filtros">
                <div className="filtro-grupo">
                    <label>Estado</label>
                    <select value={filtroEstado} onChange={e => setFiltro(e.target.value)}>
                        <option value="todos">Todos</option>
                        <option value="pagado">Pagado</option>
                        <option value="anulado">Anulado</option>
                    </select>
                </div>
                <div className="filtro-grupo">
                    <label>Buscar por documento</label>
                    <div className="filtro-buscar">
                        <i className="ti ti-search"></i>
                        <input
                            type="text"
                            placeholder="DNI, CE..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && buscarPorDoc()}
                        />
                        <button onClick={buscarPorDoc} className="btn-buscar-inline">Buscar</button>
                    </div>
                </div>
                <button className="btn-limpiar" onClick={() => { setBusqueda(""); setFiltro("todos"); fetchVentas(); }}>
                    <i className="ti ti-filter-off"></i> Limpiar
                </button>
            </div>

            {/* TABLA */}
            {cargando && <div className="pasajes-estado"><i className="ti ti-loader-2 spin"></i> Cargando...</div>}
            {error && !cargando && <div className="pasajes-estado error"><i className="ti ti-alert-circle"></i> {error}</div>}

            {!cargando && !error && (
                <div className="pasajes-tabla-wrapper">
                    <table className="pasajes-tabla">
                        <thead>
                        <tr>
                            <th>Comprobante</th>
                            <th>Pasajero</th>
                            <th>Documento</th>
                            <th>Viaje</th>
                            <th>Tramo</th>
                            <th>Asiento</th>
                            <th>Precio</th>
                            <th>Fecha</th>
                            <th>Estado</th>
                            {puedeVender && <th>Acciones</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {ventasFiltradas.length === 0 ? (
                            <tr>
                                <td colSpan={puedeVender ? 10 : 9} className="tabla-vacia">
                                    <i className="ti ti-ticket-off"></i>
                                    <span>No se encontraron pasajes</span>
                                </td>
                            </tr>
                        ) : (
                            ventasFiltradas.map(v => (
                                <tr key={v.id} className={v.estado === "ANULADO" ? "fila-anulada" : ""}>
                                    <td className="codigo">
                                        {v.serieComprobante}-{v.numeroComprobante}
                                        <br />
                                        <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                                                {COMP_LABEL[v.tipoComprobante]}
                                            </span>
                                    </td>
                                    <td>
                                        <div className="pasajero-info">
                                            <strong>{v.pasajeroNombre}</strong>
                                            <span>{v.edad} años — {v.sexo}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="pasajero-info">
                                            <span>{v.tipoDocumento}</span>
                                            <strong>{v.pasajeroDocumento}</strong>
                                        </div>
                                    </td>
                                    <td className="codigo">{v.viajeCodigo}</td>
                                    <td>
                                        <div className="tramo-info">
                                            <span>{v.paradaOrigen}</span>
                                            <i className="ti ti-arrow-right"></i>
                                            <span>{v.paradaDestino}</span>
                                        </div>
                                    </td>
                                    <td>
                                            <span className={`asiento-tipo ${v.asientoTipo?.toLowerCase()}`}>
                                                {v.asientoTipo}
                                            </span>
                                        <strong> #{v.asientoNumero}</strong>
                                    </td>
                                    <td><strong>S/ {v.precio}</strong></td>
                                    <td>{v.fechaVenta}</td>
                                    <td>
                                            <span className={badgeEstado(v.estado)}>
                                                {ESTADO_LABEL[v.estado]}
                                            </span>
                                    </td>
                                    {puedeVender && (
                                        <td className="acciones-cell">
                                            {/* Botón comprobante - cualquier estado */}
                                            <button
                                                className="btn-accion comprobante"
                                                onClick={() => generarComprobante(v)}
                                                title="Descargar comprobante"
                                            >
                                                <i className="ti ti-file-invoice"></i>
                                            </button>

                                            {/* Botón anular - solo si está pagado */}
                                            {v.estado === "PAGADO" && (
                                                <button
                                                    className="btn-accion anular"
                                                    onClick={() => anularVenta(v.id)}
                                                    title="Anular venta"
                                                >
                                                    <i className="ti ti-ban"></i>
                                                </button>
                                            )}

                                            {/*Enviar comprobante */}
                                            {v.clienteEmail && v.estado === "PAGADO" && (
                                                <button
                                                    className="btn-accion email"
                                                    onClick={() => enviarCorreo(v.id)}
                                                    title={`Enviar a ${v.clienteEmail}`}
                                                >
                                                    <i className="ti ti-mail"></i>
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL WIZARD */}
            {modalAbierto && (
                <div className="modal-overlay" onClick={cerrarModal}>
                    <div className="modal modal-wizard" onClick={e => e.stopPropagation()}>

                        {/* HEADER CON PASOS */}
                        <div className="wizard-header">
                            <h3>Nuevo Pasaje</h3>
                            <div className="wizard-pasos">
                                {["Viaje", "Pasajero", "Tramo", "Asiento", "Comprobante"].map((label, i) => (
                                    <div key={i} className={`wizard-paso ${paso === i + 1 ? "activo" : ""} ${paso > i + 1 ? "completado" : ""}`}>
                                        <div className="wizard-paso-num">
                                            {paso > i + 1 ? <i className="ti ti-check"></i> : i + 1}
                                        </div>
                                        <span>{label}</span>
                                    </div>
                                ))}
                            </div>
                            <button className="modal-cerrar" onClick={cerrarModal}>
                                <i className="ti ti-x"></i>
                            </button>
                        </div>

                        <div className="modal-body modal-scroll">

                            {/* ── PASO 1: VIAJE ── */}
                            {paso === 1 && (
                                <div className="wizard-contenido">
                                    <p className="wizard-titulo">Selecciona el viaje</p>
                                    <div className="form-grupo">
                                        <label>Viaje *</label>
                                        <select name="viajeId" value={form.viajeId} onChange={handleChange}>
                                            <option value="">Seleccionar viaje...</option>
                                            {viajes.map(v => (
                                                <option key={v.id} value={v.id}>
                                                    {v.codigoViaje} — {v.rutaNombre} — {v.fechaSalida} {v.horaSalida}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {viajeSeleccionado && (
                                        <div className="viaje-card">
                                            <div className="viaje-card-item">
                                                <i className="ti ti-ship"></i>
                                                <span>{viajeSeleccionado.embarcacionNombre}</span>
                                            </div>
                                            <div className="viaje-card-item">
                                                <i className="ti ti-route"></i>
                                                <span>{viajeSeleccionado.rutaNombre}</span>
                                            </div>
                                            <div className="viaje-card-item">
                                                <i className="ti ti-calendar"></i>
                                                <span>{viajeSeleccionado.fechaSalida} a las {viajeSeleccionado.horaSalida}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── PASO 2: PASAJERO ── */}
                            {paso === 2 && (
                                <div className="wizard-contenido">
                                    <p className="wizard-titulo">Datos del pasajero</p>
                                    <div className="form-fila">
                                        <div className="form-grupo">
                                            <label>Tipo Documento *</label>
                                            <select name="tipoDocumento" value={form.tipoDocumento} onChange={handleChange}>
                                                {TIPO_DOC.map(t => <option key={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-grupo">
                                            <label>Número Documento *</label>
                                            <input type="text" name="pasajeroDocumento"
                                                   value={form.pasajeroDocumento} onChange={handleChange}
                                                   placeholder="12345678" />
                                        </div>
                                    </div>
                                    <div className="form-grupo">
                                        <label>Nombre Completo *</label>
                                        <input type="text" name="pasajeroNombre"
                                               value={form.pasajeroNombre} onChange={handleChange}
                                               placeholder="Juan Pérez García" />
                                    </div>
                                    <div className="form-fila">
                                        <div className="form-grupo">
                                            <label>Edad</label>
                                            <input type="number" name="edad"
                                                   value={form.edad} onChange={handleChange}
                                                   placeholder="25" min="0" max="120" />
                                        </div>
                                        <div className="form-grupo">
                                            <label>Sexo</label>
                                            <select name="sexo" value={form.sexo} onChange={handleChange}>
                                                {SEXO.map(s => <option key={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-fila">
                                        <div className="form-grupo">
                                            <label>Procedencia</label>
                                            <input type="text" name="procedencia"
                                                   value={form.procedencia} onChange={handleChange}
                                                   placeholder="Lima" />
                                        </div>
                                        <div className="form-grupo">
                                            <label>Teléfono</label>
                                            <input type="text" name="pasajeroTelefono"
                                                   value={form.pasajeroTelefono} onChange={handleChange}
                                                   placeholder="999888777" />
                                        </div>
                                    </div>

                                    <div className="form-grupo">
                                        <label>Correo electrónico</label>
                                        <input type="email" name="clienteEmail"
                                               value={form.clienteEmail} onChange={handleChange}
                                               placeholder="correo@ejemplo.com" />
                                    </div>
                                </div>
                            )}

                            {/* ── PASO 3: TRAMO ── */}
                            {paso === 3 && (
                                <div className="wizard-contenido">
                                    <p className="wizard-titulo">Selecciona el tramo</p>
                                    <div className="form-fila">
                                        <div className="form-grupo">
                                            <label>Origen *</label>
                                            <select name="paradaOrigen" value={form.paradaOrigen}
                                                    onChange={e => {
                                                        const p = paradas.find(p => p.nombre === e.target.value);
                                                        setForm(prev => ({ ...prev, paradaOrigen: e.target.value, ordenOrigen: p?.orden || "" }));
                                                    }}>
                                                <option value="">Seleccionar...</option>
                                                {paradas.map(p => (
                                                    <option key={p.id} value={p.nombre}>{p.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-grupo">
                                            <label>Destino *</label>
                                            <select name="paradaDestino" value={form.paradaDestino}
                                                    onChange={e => {
                                                        const p = paradas.find(p => p.nombre === e.target.value);
                                                        setForm(prev => ({ ...prev, paradaDestino: e.target.value, ordenDestino: p?.orden || "" }));
                                                    }}>
                                                <option value="">Seleccionar...</option>
                                                {paradas.filter(p => p.orden > (form.ordenOrigen || 0)).map(p => (
                                                    <option key={p.id} value={p.nombre}>{p.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {form.paradaOrigen && form.paradaDestino && (
                                        <div className="tramo-resumen">
                                            <i className="ti ti-route"></i>
                                            <strong>{form.paradaOrigen}</strong>
                                            <i className="ti ti-arrow-right"></i>
                                            <strong>{form.paradaDestino}</strong>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── PASO 4: ASIENTO ── */}
                            {paso === 4 && (
                                <div className="wizard-contenido">
                                    <p className="wizard-titulo">Selecciona un asiento</p>

                                    {tarifa && (
                                        <div className="tarifa-info">
                                            <span><i className="ti ti-star" aria-hidden="true"></i> VIP: <strong>S/ {tarifa.precioVip}</strong></span>
                                            <span><i className="ti ti-armchair" aria-hidden="true"></i> Normal: <strong>S/ {tarifa.precioNormal}</strong></span>
                                        </div>
                                    )}

                                    <div className="emb-leyenda">
                                        <div className="ley-item"><div className="ley-box ley-vip"></div> VIP</div>
                                        <div className="ley-item"><div className="ley-box ley-libre"></div> Normal</div>
                                        <div className="ley-item"><div className="ley-box ley-ocupado"></div> Ocupado</div>
                                        <div className="ley-item"><div className="ley-box ley-sel"></div> Seleccionado</div>
                                    </div>

                                    <div className="proa-label">⬆ proa</div>

                                    <div className="barco-contenedor">

                                        {/* VIP */}
                                        {chunkArray(asientos.filter(a => a.tipo === "VIP"), 4).map((fila, fi) => (
                                            <div className="barco-seccion">
                                                <p className="barco-seccion-label">⭐ VIP</p>
                                                <div className="barco-filas">
                                                    {chunkArray(asientos.filter(a => a.tipo === "VIP"), 4).map((fila, fi) => (
                                                        <div key={fi} className="barco-fila">
                                                            {fila.slice(0, 2).map(a => (
                                                                <button
                                                                    key={a.id}
                                                                    className={`barco-asiento vip ${!a.libreParaTramo ? "ocupado" : ""} ${form.asientoNumero === a.numero ? "seleccionado" : ""}`}
                                                                    onClick={() => a.libreParaTramo && seleccionarAsiento(a)}
                                                                    disabled={!a.libreParaTramo}
                                                                    title={!a.libreParaTramo ? "Ocupado" : `VIP #${a.numero} — S/ ${tarifa?.precioVip}`}
                                                                >
                                                                    {a.numero}
                                                                </button>
                                                            ))}
                                                            <div className="barco-pasillo"></div>
                                                            {fila.slice(2, 4).map(a => (
                                                                <button
                                                                    key={a.id}
                                                                    className={`barco-asiento vip ${!a.libreParaTramo ? "ocupado" : ""} ${form.asientoNumero === a.numero ? "seleccionado" : ""}`}
                                                                    onClick={() => a.libreParaTramo && seleccionarAsiento(a)}
                                                                    disabled={!a.libreParaTramo}
                                                                    title={!a.libreParaTramo ? "Ocupado" : `VIP #${a.numero} — S/ ${tarifa?.precioVip}`}
                                                                >
                                                                    {a.numero}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        <div className="barco-divisor"></div>

                                        {/* NORMAL */}
                                        {chunkArray(asientos.filter(a => a.tipo === "NORMAL"), 6).map((fila, fi) => (
                                            <div className="barco-seccion">
                                                <p className="barco-seccion-label">💺 Normal</p>
                                                <div className="barco-filas">
                                                    {chunkArray(asientos.filter(a => a.tipo === "NORMAL"), 4).map((fila, fi) => (
                                                        <div key={fi} className="barco-fila">
                                                            {fila.slice(0, 2).map(a => (
                                                                <button
                                                                    key={a.id}
                                                                    className={`barco-asiento normal ${!a.libreParaTramo ? "ocupado" : ""} ${form.asientoNumero === a.numero ? "seleccionado" : ""}`}
                                                                    onClick={() => a.libreParaTramo && seleccionarAsiento(a)}
                                                                    disabled={!a.libreParaTramo}
                                                                    title={!a.libreParaTramo ? "Ocupado" : `Normal #${a.numero} — S/ ${tarifa?.precioNormal}`}
                                                                >
                                                                    {a.numero}
                                                                </button>
                                                            ))}
                                                            <div className="barco-pasillo"></div>
                                                            {fila.slice(2, 4).map(a => (
                                                                <button
                                                                    key={a.id}
                                                                    className={`barco-asiento normal ${!a.libreParaTramo ? "ocupado" : ""} ${form.asientoNumero === a.numero ? "seleccionado" : ""}`}
                                                                    onClick={() => a.libreParaTramo && seleccionarAsiento(a)}
                                                                    disabled={!a.libreParaTramo}
                                                                    title={!a.libreParaTramo ? "Ocupado" : `Normal #${a.numero} — S/ ${tarifa?.precioNormal}`}
                                                                >
                                                                    {a.numero}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                    </div>

                                    <div className="popa-label">⬇ popa</div>

                                    {form.asientoNumero && (
                                        <div className="asiento-seleccionado-info">
                                            <i className="ti ti-check-circle" aria-hidden="true"></i>
                                            Asiento <strong>#{form.asientoNumero}</strong> — {form.asientoTipo} —
                                            <strong> S/ {form.precio}</strong>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── PASO 5: COMPROBANTE ── */}
                            {paso === 5 && (
                                <div className="wizard-contenido">
                                    <p className="wizard-titulo">Datos del comprobante</p>

                                    <div className="form-grupo">
                                        <label>Tipo Comprobante *</label>
                                        <div className="comp-selector">
                                            {COMPROBANTES.map(c => (
                                                <button
                                                    key={c}
                                                    className={`comp-btn ${form.tipoComprobante === c ? "activo" : ""}`}
                                                    onClick={() => setForm(prev => ({ ...prev, tipoComprobante: c }))}
                                                >
                                                    {COMP_LABEL[c]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="form-fila">
                                        <div className="form-grupo">
                                            <label>Tipo Doc. Cliente</label>
                                            <select name="clienteTipoDoc" value={form.clienteTipoDoc} onChange={handleChange}>
                                                {TIPO_DOC.map(t => <option key={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-grupo">
                                            <label>Documento Cliente *</label>
                                            <input type="text" name="clienteDocumento"
                                                   value={form.clienteDocumento} onChange={handleChange}
                                                   placeholder="12345678" />
                                        </div>
                                    </div>

                                    <div className="form-grupo">
                                        <label>Nombre Cliente *</label>
                                        <input type="text" name="clienteNombre"
                                               value={form.clienteNombre} onChange={handleChange}
                                               placeholder="Juan Pérez" />
                                    </div>

                                    <div className="form-grupo">
                                        <label>Detalle</label>
                                        <input type="text" name="detalleComprobante"
                                               value={form.detalleComprobante} onChange={handleChange}
                                               placeholder="Servicio de transporte fluvial" />
                                    </div>

                                    {/* Resumen final */}
                                    <div className="resumen-venta">
                                        <p className="resumen-titulo"><i className="ti ti-receipt"></i> Resumen de la venta</p>
                                        <div className="resumen-fila"><span>Pasajero</span><strong>{form.pasajeroNombre}</strong></div>
                                        <div className="resumen-fila"><span>Viaje</span><strong>{viajeSeleccionado?.codigoViaje}</strong></div>
                                        <div className="resumen-fila"><span>Tramo</span><strong>{form.paradaOrigen} → {form.paradaDestino}</strong></div>
                                        <div className="resumen-fila"><span>Asiento</span><strong>{form.asientoTipo} #{form.asientoNumero}</strong></div>
                                        <div className="resumen-fila resumen-total"><span>Total</span><strong>S/ {form.precio}</strong></div>
                                    </div>
                                </div>
                            )}

                            {errorModal && (
                                <div className="modal-error">
                                    <i className="ti ti-alert-circle"></i> {errorModal}
                                </div>
                            )}
                        </div>

                        {/* FOOTER */}
                        <div className="modal-footer">
                            {paso > 1 && (
                                <button className="btn-cancelar" onClick={() => { setPaso(paso - 1); setErrorModal(null); }}>
                                    <i className="ti ti-arrow-left"></i> Anterior
                                </button>
                            )}
                            {paso < 5 && (
                                <button className="btn-guardar" onClick={
                                    paso === 1 ? confirmarViaje :
                                        paso === 2 ? confirmarPasajero :
                                            paso === 3 ? confirmarTramo :
                                                confirmarAsiento
                                }>
                                    Siguiente <i className="ti ti-arrow-right"></i>
                                </button>
                            )}
                            {paso === 5 && (
                                <button className="btn-guardar" onClick={confirmarVenta} disabled={guardando}>
                                    {guardando
                                        ? <><i className="ti ti-loader-2 spin"></i> Registrando...</>
                                        : <><i className="ti ti-check"></i> Confirmar Venta</>
                                    }
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Pasajes;