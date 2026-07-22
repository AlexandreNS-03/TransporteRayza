import { useState, useEffect } from "react";
import "./Pasajes.css";
import generarComprobante from "../../../Utils/generarComprobante.jsx";
import generarTicketA4 from "../../../Utils/generarTicketA4.jsx";
import GenerarComprobanteModal from "../Finanzas/GenerarComprobanteModal.jsx";


import { apiFetch, consultarDni } from "../../../Services/api.js";
import { useToast, Toasts } from "../../../Components/Toast.jsx";
import { usePaginacion, Paginacion } from "../../../Components/Paginacion.jsx";

const TIPO_DOC     = ["DNI", "CE", "PASAPORTE", "RUC"];
const SEXO         = ["Masculino", "Femenino", "Otro"];
const COMPROBANTES = ["TICKET", "BOLETA", "FACTURA"];
const COMP_LABEL   = { TICKET: "Ticket", BOLETA: "Boleta", FACTURA: "Factura" };

const ESTADO_LABEL = { PAGADO: "Pagado", ANULADO: "Anulado" };

function badgeEstado(estado) {
    return estado === "PAGADO" ? "badge badge-pagado" : "badge badge-anulado";
}

function Pasajes() {
    const usuario      = JSON.parse(localStorage.getItem("usuario"));
    const esAdmin      = usuario?.rol === "ADMIN";
    const esSupervisor = usuario?.rol === "SUPERVISOR";
    const puedeVender  = esAdmin || esSupervisor;
    const { toasts, mostrarToast } = useToast();

    // Lista ventas
    const [ventas, setVentas]         = useState([]);
    const [cargando, setCargando]     = useState(true);
    const [error, setError]           = useState(null);
    const [busqueda, setBusqueda]     = useState("");
    const [filtroEstado, setFiltro]   = useState("todos");

    // Comprobantes electrónicos (Nubefact)
    const [comprobantes, setComprobantes]           = useState([]);
    const [ventaParaComprobante, setVentaParaComp]  = useState(null);

    // Edición de venta
    const [ventaEdit, setVentaEdit]   = useState(null);
    const [formEdit, setFormEdit]     = useState(null);
    const [guardandoEdit, setGuardandoEdit] = useState(false);
    const [errorEdit, setErrorEdit]   = useState(null);

    // Modal wizard
    const [modalAbierto, setModal]    = useState(false);
    const [paso, setPaso]             = useState(1);
    const [guardando, setGuardando]   = useState(false);
    const [errorModal, setErrorModal] = useState(null);
    const [consultandoDni, setConsultandoDni] = useState(false);

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

    useEffect(() => { fetchVentas(); fetchComprobantes(); }, []);

    const fetchComprobantes = async () => {
        try {
            const data = await apiFetch("/api/comprobantes");
            setComprobantes(data);
        } catch (err) { console.error(err); }
    };

    // Comprobante electrónico vigente (ACEPTADO) por venta — las notas de crédito no cuentan
    const comprobantePorVenta = (ventaId) =>
        comprobantes.find(c => c.ventaId === ventaId && c.estado === "ACEPTADO" && c.tipoDeComprobante !== "NOTA_CREDITO");

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
            // Venta por sucursal: cada sucursal solo vende los viajes que salen de ella
            // (ADMIN o usuarios sin sucursal asignada ven todos)
            const soloMiSucursal = !esAdmin && usuario?.sucursalId;
            setViajes(data.filter(v =>
                v.estado === "PROGRAMADO" &&
                (!soloMiSucursal || v.sucursalId === usuario.sucursalId)
            ));
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
            await apiFetch(`/api/ventas/${id}/enviar-comprobante`, { method: "POST" });
            mostrarToast("success", "Comprobante enviado al correo del pasajero");
        } catch (err) {
            mostrarToast("error", "Error al enviar el comprobante: " + err.message);
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

    // Autocompletar nombre del pasajero por DNI
    const consultarDniPasajero = async () => {
        setConsultandoDni(true);
        setErrorModal(null);
        try {
            const data = await consultarDni(form.pasajeroDocumento.trim());
            setForm(prev => ({ ...prev, pasajeroNombre: data.nombreCompleto }));
        } catch (err) { setErrorModal(err.message); }
        finally { setConsultandoDni(false); }
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

    // Editar venta (datos del pasajero / comprobante)
    const abrirEdicion = (v) => {
        setVentaEdit(v);
        setErrorEdit(null);
        setFormEdit({
            tipoDocumento:     v.tipoDocumento || "DNI",
            pasajeroNombre:    v.pasajeroNombre || "",
            pasajeroDocumento: v.pasajeroDocumento || "",
            procedencia:       v.procedencia || "",
            pasajeroTelefono:  v.pasajeroTelefono || "",
            clienteEmail:      v.clienteEmail || "",
            edad:              v.edad ?? "",
            sexo:              v.sexo || "Masculino",
            clienteNombre:     v.clienteNombre || "",
            clienteTipoDoc:    v.clienteTipoDoc || "DNI",
            clienteDocumento:  v.clienteDocumento || "",
            detalleComprobante: v.detalleComprobante || ""
        });
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setFormEdit(prev => ({ ...prev, [name]: value }));
    };

    const guardarEdicion = async () => {
        if (!formEdit.pasajeroNombre.trim() || !formEdit.pasajeroDocumento.trim()) {
            setErrorEdit("Nombre y documento del pasajero son obligatorios");
            return;
        }
        setGuardandoEdit(true);
        setErrorEdit(null);
        try {
            await apiFetch(`/api/ventas/${ventaEdit.id}`, {
                method: "PUT",
                body: JSON.stringify({ ...formEdit, edad: formEdit.edad ? parseInt(formEdit.edad) : null })
            });
            setVentaEdit(null);
            mostrarToast("success", "Datos del pasaje actualizados");
            fetchVentas();
        } catch (err) { setErrorEdit(err.message); }
        finally { setGuardandoEdit(false); }
    };

    // Anular venta
    const anularVenta = async (id) => {
        if (!confirm("¿Confirmas anular esta venta?")) return;
        try {
            await apiFetch(`/api/ventas/${id}/anular`, { method: "PATCH" });
            mostrarToast("success", "Venta anulada y asiento liberado");
            fetchVentas();
        } catch (err) { mostrarToast("error", "Error al anular la venta: " + err.message); }
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

    const pag = usePaginacion(ventasFiltradas, 10);

    const viajeSeleccionado = viajes.find(v => v.id === form.viajeId);

    const chunkArray = (arr, size) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    };

    // Orden de las secciones dentro del bote según dónde esté el VIP en esta embarcación.
    // POPA (por defecto) = VIP atrás → primero Normal, luego VIP.
    const seccionesBarco = viajeSeleccionado?.vipPosicion === "PROA"
        ? ["VIP", "NORMAL"]
        : ["NORMAL", "VIP"];

    // Dibuja una sección (VIP o Normal) con sus filas de 2 + pasillo + 2
    const renderSeccionAsientos = (tipo) => {
        const deTipo = asientos.filter(a => a.tipo === tipo);
        if (deTipo.length === 0) return null;

        const esVip   = tipo === "VIP";
        const precio  = esVip ? tarifa?.precioVip : tarifa?.precioNormal;
        const etiqueta = esVip ? "⭐ VIP" : "💺 Normal";

        const boton = (a) => (
            <button
                key={a.id}
                className={`barco-asiento ${esVip ? "vip" : "normal"} ${!a.libreParaTramo ? "ocupado" : ""} ${form.asientoNumero === a.numero ? "seleccionado" : ""}`}
                onClick={() => a.libreParaTramo && seleccionarAsiento(a)}
                disabled={!a.libreParaTramo}
                title={!a.libreParaTramo ? "Ocupado" : `${esVip ? "VIP" : "Normal"} #${a.numero} — S/ ${precio}`}
            >
                {a.numero}
            </button>
        );

        return (
            <div className="barco-seccion">
                <p className="barco-seccion-label">{etiqueta}</p>
                <div className="barco-filas">
                    {chunkArray(deTipo, 4).map((fila, fi) => (
                        <div key={fi} className="barco-fila">
                            {fila.slice(0, 2).map(boton)}
                            <div className="barco-pasillo"></div>
                            {fila.slice(2, 4).map(boton)}
                        </div>
                    ))}
                </div>
            </div>
        );
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
                        {pag.items.length === 0 ? (
                            <tr>
                                <td colSpan={puedeVender ? 10 : 9} className="tabla-vacia">
                                    <i className="ti ti-ticket-off"></i>
                                    <span>No se encontraron pasajes</span>
                                </td>
                            </tr>
                        ) : (
                            pag.items.map(v => (
                                <tr key={v.id} className={v.estado === "ANULADO" ? "fila-anulada" : ""}>
                                    <td className="codigo" data-label="Comprobante">
                                        {v.serieComprobante}-{v.numeroComprobante}
                                        <br />
                                        <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                                                {COMP_LABEL[v.tipoComprobante]}
                                            </span>
                                    </td>
                                    <td data-label="Pasajero">
                                        <div className="pasajero-info">
                                            <strong>{v.pasajeroNombre}</strong>
                                            <span>{v.edad} años — {v.sexo}</span>
                                        </div>
                                    </td>
                                    <td data-label="Documento">
                                        <div className="pasajero-info">
                                            <span>{v.tipoDocumento}</span>
                                            <strong>{v.pasajeroDocumento}</strong>
                                        </div>
                                    </td>
                                    <td className="codigo" data-label="Viaje">{v.viajeCodigo}</td>
                                    <td data-label="Tramo">
                                        <div className="tramo-info">
                                            <span>{v.paradaOrigen}</span>
                                            <i className="ti ti-arrow-right"></i>
                                            <span>{v.paradaDestino}</span>
                                        </div>
                                    </td>
                                    <td data-label="Asiento">
                                            <span className={`asiento-tipo ${v.asientoTipo?.toLowerCase()}`}>
                                                {v.asientoTipo}
                                            </span>
                                        <strong> #{v.asientoNumero}</strong>
                                    </td>
                                    <td data-label="Precio"><strong>S/ {v.precio}</strong></td>
                                    <td data-label="Fecha">{v.fechaVenta}</td>
                                    <td data-label="Estado">
                                            <span className={badgeEstado(v.estado)}>
                                                {ESTADO_LABEL[v.estado]}
                                            </span>
                                        {v.canal === "WEB" && (
                                            <span className="badge-canal" title="Comprado por la web de clientes">
                                                <i className="ti ti-world"></i> Web
                                            </span>
                                        )}
                                    </td>
                                    {puedeVender && (
                                        <td className="acciones-cell">
                                            {/* Descargar ticket 80mm (térmica) */}
                                            <button
                                                className="btn-accion comprobante"
                                                onClick={() => generarComprobante(v)}
                                                title="Descargar ticket (80mm)"
                                            >
                                                <i className="ti ti-file-invoice"></i>
                                            </button>

                                            {/* Descargar ticket A4 */}
                                            <button
                                                className="btn-accion a4"
                                                onClick={() => generarTicketA4(v)}
                                                title="Descargar ticket (A4)"
                                            >
                                                <i className="ti ti-file-type-pdf"></i>
                                            </button>

                                            {/* Editar datos del pasaje - solo si está pagado */}
                                            {v.estado === "PAGADO" && (
                                                <button
                                                    className="btn-accion editar"
                                                    onClick={() => abrirEdicion(v)}
                                                    title="Editar datos del pasajero"
                                                >
                                                    <i className="ti ti-edit"></i>
                                                </button>
                                            )}

                                            {/* Comprobante electrónico (boleta/factura Nubefact) */}
                                            {v.estado === "PAGADO" && (
                                                comprobantePorVenta(v.id) ? (
                                                    <button
                                                        className="btn-accion emitido"
                                                        title={`Comprobante emitido: ${comprobantePorVenta(v.id).serie}-${String(comprobantePorVenta(v.id).numero).padStart(8, "0")}`}
                                                        disabled
                                                    >
                                                        <i className="ti ti-file-check"></i>
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="btn-accion generar"
                                                        onClick={() => setVentaParaComp(v)}
                                                        title="Generar boleta / factura electrónica"
                                                    >
                                                        <i className="ti ti-receipt-2"></i>
                                                    </button>
                                                )
                                            )}

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

            {!cargando && !error && <Paginacion {...pag} />}

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
                                            <div className="doc-consulta">
                                                <input type="text" name="pasajeroDocumento"
                                                       value={form.pasajeroDocumento} onChange={handleChange}
                                                       placeholder="12345678" />
                                                {form.tipoDocumento === "DNI" && (
                                                    <button type="button" className="btn-consulta"
                                                            onClick={consultarDniPasajero}
                                                            disabled={!/^\d{8}$/.test(form.pasajeroDocumento.trim()) || consultandoDni}
                                                            title="Consultar nombre (RENIEC)">
                                                        {consultandoDni
                                                            ? <i className="ti ti-loader-2 spin"></i>
                                                            : <><i className="ti ti-search"></i></>}
                                                    </button>
                                                )}
                                            </div>
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

                                    <div className="proa-label">⬆ proa (adelante)</div>

                                    <div className="barco-contenedor">

                                        {/* Cabina del capitán, siempre en la proa */}
                                        <div className="barco-cabina">
                                            <i className="ti ti-steering-wheel"></i>
                                            <span>Cabina{viajeSeleccionado?.capitan ? ` — ${viajeSeleccionado.capitan}` : ""}</span>
                                        </div>

                                        {/* Secciones ordenadas según dónde está el VIP en esta embarcación */}
                                        {seccionesBarco.map((tipo, idx) => (
                                            <div key={tipo}>
                                                {idx > 0 && <div className="barco-divisor"></div>}
                                                {renderSeccionAsientos(tipo)}
                                            </div>
                                        ))}

                                        {/* Motor, siempre en la popa */}
                                        <div className="barco-motor">
                                            <i className="ti ti-propeller"></i>
                                            <span>Motor</span>
                                        </div>
                                    </div>

                                    <div className="popa-label">⬇ popa (atrás)</div>

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

            {/* MODAL COMPROBANTE ELECTRÓNICO */}
            {ventaParaComprobante && (
                <GenerarComprobanteModal
                    venta={ventaParaComprobante}
                    onClose={() => setVentaParaComp(null)}
                    onGenerado={(c) => {
                        setVentaParaComp(null);
                        fetchComprobantes();
                        mostrarToast("success", `Comprobante ${c.serie}-${String(c.numero).padStart(8, "0")} emitido correctamente`);
                    }}
                />
            )}

            {/* MODAL EDITAR PASAJE */}
            {ventaEdit && formEdit && (
                <div className="modal-overlay" onClick={() => setVentaEdit(null)}>
                    <div className="modal modal-wizard" onClick={e => e.stopPropagation()}>
                        <div className="wizard-header">
                            <h3>Editar Pasaje — {ventaEdit.serieComprobante}-{ventaEdit.numeroComprobante}</h3>
                            <button className="modal-cerrar" onClick={() => setVentaEdit(null)}>
                                <i className="ti ti-x"></i>
                            </button>
                        </div>
                        <div className="modal-body modal-scroll">
                            <div className="wizard-contenido">
                                <div className="edit-nota">
                                    <i className="ti ti-info-circle"></i>
                                    Puedes corregir los datos del pasajero y del comprobante. El viaje, asiento,
                                    tramo y precio no se editan (para eso anula y vuelve a vender).
                                </div>

                                <p className="wizard-titulo">Datos del pasajero</p>
                                <div className="form-fila">
                                    <div className="form-grupo">
                                        <label>Tipo Documento</label>
                                        <select name="tipoDocumento" value={formEdit.tipoDocumento} onChange={handleEditChange}>
                                            {TIPO_DOC.map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-grupo">
                                        <label>Número Documento *</label>
                                        <input type="text" name="pasajeroDocumento" value={formEdit.pasajeroDocumento} onChange={handleEditChange} />
                                    </div>
                                </div>
                                <div className="form-grupo">
                                    <label>Nombre Completo *</label>
                                    <input type="text" name="pasajeroNombre" value={formEdit.pasajeroNombre} onChange={handleEditChange} />
                                </div>
                                <div className="form-fila">
                                    <div className="form-grupo">
                                        <label>Edad</label>
                                        <input type="number" name="edad" value={formEdit.edad} onChange={handleEditChange} min="0" max="120" />
                                    </div>
                                    <div className="form-grupo">
                                        <label>Sexo</label>
                                        <select name="sexo" value={formEdit.sexo} onChange={handleEditChange}>
                                            {SEXO.map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-fila">
                                    <div className="form-grupo">
                                        <label>Procedencia</label>
                                        <input type="text" name="procedencia" value={formEdit.procedencia} onChange={handleEditChange} />
                                    </div>
                                    <div className="form-grupo">
                                        <label>Teléfono</label>
                                        <input type="text" name="pasajeroTelefono" value={formEdit.pasajeroTelefono} onChange={handleEditChange} />
                                    </div>
                                </div>
                                <div className="form-grupo">
                                    <label>Correo electrónico</label>
                                    <input type="email" name="clienteEmail" value={formEdit.clienteEmail} onChange={handleEditChange} />
                                </div>

                                <p className="wizard-titulo">Datos del comprobante</p>
                                <div className="form-fila">
                                    <div className="form-grupo">
                                        <label>Tipo Doc. Cliente</label>
                                        <select name="clienteTipoDoc" value={formEdit.clienteTipoDoc} onChange={handleEditChange}>
                                            {TIPO_DOC.map(t => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-grupo">
                                        <label>Documento Cliente</label>
                                        <input type="text" name="clienteDocumento" value={formEdit.clienteDocumento} onChange={handleEditChange} />
                                    </div>
                                </div>
                                <div className="form-grupo">
                                    <label>Nombre Cliente</label>
                                    <input type="text" name="clienteNombre" value={formEdit.clienteNombre} onChange={handleEditChange} />
                                </div>
                                <div className="form-grupo">
                                    <label>Detalle</label>
                                    <input type="text" name="detalleComprobante" value={formEdit.detalleComprobante} onChange={handleEditChange} />
                                </div>

                                {errorEdit && <div className="modal-error"><i className="ti ti-alert-circle"></i> {errorEdit}</div>}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={() => setVentaEdit(null)}>Cancelar</button>
                            <button className="btn-guardar" onClick={guardarEdicion} disabled={guardandoEdit}>
                                {guardandoEdit
                                    ? <><i className="ti ti-loader-2 spin"></i> Guardando...</>
                                    : <><i className="ti ti-check"></i> Guardar cambios</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Toasts toasts={toasts} />
        </div>
    );
}

export default Pasajes;