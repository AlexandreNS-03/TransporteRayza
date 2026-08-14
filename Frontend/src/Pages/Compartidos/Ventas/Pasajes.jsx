import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import "./Pasajes.css";
import generarComprobante from "../../../Utils/generarComprobante.jsx";
import generarTicketA4 from "../../../Utils/generarTicketA4.jsx";
import GenerarComprobanteModal from "../Finanzas/GenerarComprobanteModal.jsx";
import { avisarGuardado, CARPETAS } from "../../../Utils/descargas.js";


import { apiFetch, consultarDni } from "../../../Services/api.js";
import { useToast, Toasts } from "../../../Components/Toast.jsx";
import { usePaginacion, Paginacion } from "../../../Components/Paginacion.jsx";
import SelectorViaje from "../../../Components/SelectorViaje.jsx";

const TIPO_DOC     = ["DNI", "CE", "PASAPORTE", "RUC"];
const SEXO         = ["Masculino", "Femenino", "Otro"];
const COMPROBANTES = ["TICKET", "BOLETA", "FACTURA"];
const METODOS_PAGO = [
    { key: "EFECTIVO",      label: "Efectivo" },
    { key: "YAPE",          label: "Yape" },
    { key: "PLIN",          label: "Plin" },
    { key: "TARJETA",       label: "Tarjeta" },
    { key: "TRANSFERENCIA", label: "Transferencia" },
];
const COMP_LABEL   = { TICKET: "Ticket", BOLETA: "Boleta", FACTURA: "Factura" };

const ESTADO_LABEL = { PAGADO: "Pagado", ANULADO: "Anulado" };

function badgeEstado(estado) {
    return estado === "PAGADO" ? "badge badge-pagado" : "badge badge-anulado";
}

// Compara dos valores (texto o número) para ordenar. "es" + numeric ordena bien
// nombres (A-Z / Z-A), números de asiento y fechas ISO.
function comparar(a, b, dir) {
    const m = dir === "asc" ? 1 : -1;
    if (a == null) a = "";
    if (b == null) b = "";
    if (typeof a === "number" && typeof b === "number") return (a - b) * m;
    return String(a).localeCompare(String(b), "es", { numeric: true }) * m;
}

const PASAJERO_VACIO = {
    tipoDocumento: "DNI", pasajeroNombre: "", pasajeroDocumento: "",
    procedencia: "", pasajeroTelefono: "", edad: "", sexo: "Masculino"
};

const MAX_PASAJEROS = 10;

function Pasajes() {
    const usuario      = JSON.parse(localStorage.getItem("usuario"));
    const esAdmin      = usuario?.rol === "ADMIN";
    const esSupervisor = usuario?.rol === "SUPERVISOR";
    const esEmpleado = usuario?.rol === "EMPLEADO";
    const puedeVender  = esAdmin || esSupervisor || esEmpleado;
    const { toasts, mostrarToast } = useToast();

    // Lugar de pago por defecto: según la oficina (sucursal) del usuario
    const lugarPagoDefault = (() => {
        const s = (usuario?.sucursalNombre || "").toUpperCase();
        if (s.includes("IQUITOS")) return "IQUITOS";
        if (s.includes("REQUENA")) return "REQUENA";
        return "";
    })();

    // Lista ventas
    const [ventas, setVentas]         = useState([]);
    const [cargando, setCargando]     = useState(true);
    const [error, setError]           = useState(null);
    const [busqueda, setBusqueda]     = useState("");
    // El recordatorio de comprobantes llega acá con ?pendientes=1 para mostrar
    // directamente lo que falta emitir.
    const [parametros] = useSearchParams();
    const [filtroEstado, setFiltro]   = useState(
        parametros.get("pendientes") === "1" ? "sin-comprobante" : "todos");
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [orden, setOrden] = useState({ key: "createdAt", dir: "desc" });

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
    // Evita el doble toque en tablet: sin esto, dos toques seguidos en "Siguiente"
    // disparan dos tandas de peticiones (asientos/tarifa) que pueden llegar
    // desordenadas y dejar en pantalla datos de la petición vieja.
    const [avanzando, setAvanzando]   = useState(false);
    const [errorModal, setErrorModal] = useState(null);
    const [consultandoDni, setConsultandoDni] = useState(null);   // índice del pasajero consultado

    // Datos para selects
    const [viajes, setViajes]         = useState([]);
    const [paradas, setParadas]       = useState([]);
    const [asientos, setAsientos]     = useState([]);
    const [tarifa, setTarifa]         = useState(null);

    // Formulario: lo que es común a toda la compra (viaje, tramo, comprobante, pago)
    const [form, setForm] = useState({
        // Paso 1
        viajeId: "",
        // Paso 2 (contacto de la compra)
        clienteEmail: "",
        // Paso 3
        paradaOrigen: "", paradaDestino: "", ordenOrigen: "", ordenDestino: "",
        // Paso 5
        tipoComprobante: "TICKET",
        clienteNombre: "", clienteTipoDoc: "DNI",
        clienteDocumento: "", detalleComprobante: "",
        lugarPago: lugarPagoDefault,
        metodoPago: "EFECTIVO", observacion: ""
    });

    /**
     * Una fila por persona que viaja. Se venden juntas, con un solo comprobante:
     * antes había que repetir toda la venta pasajero por pasajero, y cada uno salía
     * con su propia boleta.
     */
    const [pasajeros, setPasajeros] = useState([{ ...PASAJERO_VACIO }]);

    /** Asientos elegidos, en el mismo orden que los pasajeros. */
    const [elegidos, setElegidos] = useState([]);

    useEffect(() => { fetchVentas(); fetchComprobantes(); }, []);

    const fetchComprobantes = async () => {
        try {
            const data = await apiFetch("/api/comprobantes");
            setComprobantes(data);
        } catch (err) { console.error(err); }
    };

    // Comprobante electrónico vigente (ACEPTADO) por venta — las notas de crédito no cuentan
    /**
     * Comprobante vigente de un pasaje. Si el pasaje se vendió junto a otros, el
     * comprobante es uno solo para todo el grupo: se busca también por ahí, si no
     * los demás pasajes se verían como si les faltara boleta.
     */
    const comprobantePorVenta = (v) =>
        comprobantes.find(c =>
            (c.ventaId === v.id || (v.grupoVentaId && c.grupoVentaId === v.grupoVentaId))
            && c.estado === "ACEPTADO" && c.tipoDeComprobante !== "NOTA_CREDITO");

    /** Los demás pasajes vendidos en la misma operación. */
    const grupoDe = (v) =>
        v.grupoVentaId ? ventas.filter(x => x.grupoVentaId === v.grupoVentaId) : [v];

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
            const data = await apiFetch("/api/viajes?estado=PROGRAMADO");
            // Venta por sucursal: cada sucursal solo vende los viajes que salen de ella
            // (ADMIN o usuarios sin sucursal asignada ven todos)
            const soloMiSucursal = !esAdmin && usuario?.sucursalId;
            setViajes(data.filter(v => !soloMiSucursal || v.sucursalId === usuario.sucursalId));
        } catch (err) { console.error(err); }
        setModal(true);
    };

    const resetForm = () => {
        setPaso(1);
        setErrorModal(null);
        setAvanzando(false);
        setParadas([]);
        setAsientos([]);
        setTarifa(null);
        setPasajeros([{ ...PASAJERO_VACIO }]);
        setElegidos([]);
        setForm({
            viajeId: "", clienteEmail: "",
            paradaOrigen: "", paradaDestino: "", ordenOrigen: "", ordenDestino: "",
            tipoComprobante: "TICKET", clienteNombre: "", clienteTipoDoc: "DNI",
            clienteDocumento: "", detalleComprobante: "",
            lugarPago: lugarPagoDefault,
            metodoPago: "EFECTIVO", observacion: ""
        });
    };

    const cerrarModal = () => { setModal(false); resetForm(); };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    /** Abre el PDF del comprobante electrónico ya emitido (enlace de Nubefact). */
    const abrirComprobante = (c) => {
        if (c?.enlacePdf) window.open(c.enlacePdf, "_blank", "noopener");
        else mostrarToast("error", "El comprobante aún no tiene un PDF disponible");
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
        setAvanzando(true);
        try {
            const data = await apiFetch(`/api/rutas/${viaje.rutaId}`);
            setParadas(data.paradas || []);
            setErrorModal(null);
            setPaso(2);
        } catch (err) { setErrorModal(err.message || "Error al cargar paradas del viaje"); }
        finally { setAvanzando(false); }
    };

    // ── Pasajeros ──
    const cambiarPasajero = (i, campo, valor) =>
        setPasajeros(prev => prev.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));

    /** Cambia cuántas personas viajan: agrega filas vacías o recorta las de más. */
    const cambiarCantidad = (n) => {
        const cantidad = Math.max(1, Math.min(MAX_PASAJEROS, n));
        setPasajeros(prev => {
            const arr = prev.slice(0, cantidad);
            while (arr.length < cantidad) arr.push({ ...PASAJERO_VACIO });
            return arr;
        });
        // Los asientos ya elegidos dejan de calzar si se achica el grupo.
        setElegidos(prev => prev.slice(0, cantidad));
    };

    // Autocompletar nombre del pasajero por DNI
    const consultarDniPasajero = async (i) => {
        setConsultandoDni(i);
        setErrorModal(null);
        try {
            const data = await consultarDni((pasajeros[i].pasajeroDocumento || "").trim());
            cambiarPasajero(i, "pasajeroNombre", data.nombreCompleto);
        } catch (err) { setErrorModal(err.message); }
        finally { setConsultandoDni(null); }
    };

    // ── PASO 2: datos de los pasajeros ──
    const confirmarPasajero = () => {
        for (let i = 0; i < pasajeros.length; i++) {
            const p = pasajeros[i];
            if (!p.pasajeroNombre?.trim() || !p.pasajeroDocumento?.trim()) {
                setErrorModal(`Completa el nombre y el documento del pasajero ${i + 1}`);
                return;
            }
        }
        // El primer pasajero es, por defecto, a nombre de quién va el comprobante
        setForm(prev => ({
            ...prev,
            clienteNombre: prev.clienteNombre || pasajeros[0].pasajeroNombre,
            clienteDocumento: prev.clienteDocumento || pasajeros[0].pasajeroDocumento
        }));
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
        setAvanzando(true);
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
        } catch (err) { setErrorModal(err.message || "Error al cargar asientos o tarifas"); }
        finally { setAvanzando(false); }
    };

    // ── PASO 4: seleccionar asientos (uno por pasajero) ──
    const seleccionarAsiento = (asiento) => {
        const tarifaAsiento = asiento.tipo === "VIP" ? tarifa?.precioVip : tarifa?.precioNormal;
        setElegidos(prev => {
            const ya = prev.findIndex(a => a.numero === asiento.numero);
            if (ya >= 0) return prev.filter(a => a.numero !== asiento.numero);
            if (prev.length >= pasajeros.length) return prev;   // ya están todos
            return [...prev, {
                numero: asiento.numero, tipo: asiento.tipo,
                precio: tarifaAsiento, precioOriginal: tarifaAsiento
            }];
        });
    };

    const cambiarPrecio = (i, valor) =>
        setElegidos(prev => prev.map((a, j) => (j === i ? { ...a, precio: valor } : a)));

    const confirmarAsiento = () => {
        if (elegidos.length !== pasajeros.length) {
            setErrorModal(`Elige ${pasajeros.length} asiento(s), uno por pasajero`);
            return;
        }
        setErrorModal(null);
        setPaso(5);
    };

    /** Total de la compra con los precios (ya rebajados) de cada asiento. */
    const totalCompra = elegidos.reduce((t, a) => t + (parseFloat(a.precio) || 0), 0);

    // ── PASO 5: comprobante ──
    const confirmarVenta = async () => {
        if (!form.clienteNombre || !form.clienteDocumento) {
            setErrorModal("Datos del comprobante son obligatorios");
            return;
        }
        if (!form.lugarPago) {
            setErrorModal("Indica el lugar de pago (Iquitos u oficina de Requena)");
            return;
        }
        if (!form.metodoPago) {
            setErrorModal("Indica el método de pago (Efectivo, Yape, etc.)");
            return;
        }
        for (const a of elegidos) {
            const precio = parseFloat(a.precio);
            if (isNaN(precio) || precio < 0) {
                setErrorModal(`El precio del asiento #${a.numero} no es válido`);
                return;
            }
        }

        // Datos de cada pasajero con su asiento y su precio
        const filas = pasajeros.map((p, i) => ({
            tipoDocumento:     p.tipoDocumento,
            pasajeroNombre:    p.pasajeroNombre,
            pasajeroDocumento: p.pasajeroDocumento,
            procedencia:       p.procedencia,
            pasajeroTelefono:  p.pasajeroTelefono,
            edad:              parseInt(p.edad) || null,
            sexo:              p.sexo,
            asientoNumero:     elegidos[i].numero,
            asientoTipo:       elegidos[i].tipo,
            precio:            parseFloat(elegidos[i].precio),
            precioOriginal:    elegidos[i].precioOriginal !== "" && elegidos[i].precioOriginal != null
                                   ? parseFloat(elegidos[i].precioOriginal)
                                   : parseFloat(elegidos[i].precio)
        }));

        const comun = {
            viajeId:            form.viajeId,
            paradaOrigen:       form.paradaOrigen,
            paradaDestino:      form.paradaDestino,
            ordenOrigen:        parseInt(form.ordenOrigen),
            ordenDestino:       parseInt(form.ordenDestino),
            clienteEmail:       form.clienteEmail,
            tipoComprobante:    form.tipoComprobante,
            clienteNombre:      form.clienteNombre,
            clienteTipoDoc:     form.clienteTipoDoc,
            clienteDocumento:   form.clienteDocumento,
            detalleComprobante: form.detalleComprobante,
            lugarPago:          form.lugarPago,
            metodoPago:         form.metodoPago,
            observacion:        form.observacion
        };

        setGuardando(true);
        setErrorModal(null);
        try {
            // Con un solo pasajero se usa la venta de siempre; con varios, la venta en
            // grupo, que las deja unidas para emitir un comprobante por todas.
            if (filas.length === 1) {
                await apiFetch("/api/ventas", {
                    method: "POST",
                    body: JSON.stringify({ ...comun, ...filas[0] })
                });
            } else {
                await apiFetch("/api/ventas/grupo", {
                    method: "POST",
                    body: JSON.stringify({ ...comun, pasajeros: filas })
                });
            }
            cerrarModal();
            fetchVentas();
        } catch (err) {
            setErrorModal(err.message || "Error al registrar la venta");
        }
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

    // Distinguir "no hay nada" de "tu búsqueda no encontró": son situaciones
    // distintas y la salida de cada una también.
    const hayFiltros = filtroEstado !== "todos" || !!fechaDesde || !!fechaHasta || !!busqueda;

    const limpiarFiltros = () => {
        setFiltro("todos"); setFechaDesde(""); setFechaHasta(""); setBusqueda("");
    };

    const ventasFiltradas = ventas.filter(v => {
        if (filtroEstado === "pagado"  && v.estado !== "PAGADO")  return false;
        if (filtroEstado === "anulado" && v.estado !== "ANULADO") return false;
        // Falta emitir: venta cobrada que todavía no tiene comprobante electrónico.
        // No se mira el tipo anotado al vender: se puede emitir el de cualquier venta.
        if (filtroEstado === "sin-comprobante" &&
            !(v.estado === "PAGADO" && !comprobantePorVenta(v))) return false;
        if (fechaDesde && (v.fechaVenta || "") < fechaDesde) return false;
        if (fechaHasta && (v.fechaVenta || "") > fechaHasta) return false;
        return true;
    });

    const alternarOrden = (key) => setOrden(o =>
        o.key === key ? { key, dir: o.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });

    const ventasOrdenadas = [...ventasFiltradas].sort((a, b) => {
        const val = (v) => {
            switch (orden.key) {
                case "pasajeroNombre": return v.pasajeroNombre || "";
                case "asientoNumero":  return v.asientoNumero ?? 0;
                case "precio":         return Number(v.precio) || 0;
                // Fechas: comparar como número (ms) para un orden cronológico exacto
                case "fechaVenta":     return v.fechaVenta ? Date.parse(v.fechaVenta) : 0;
                case "createdAt":      return v.createdAt ? Date.parse(v.createdAt) : 0;
                default:               return v[orden.key];
            }
        };
        return comparar(val(a), val(b), orden.dir);
    });

    const pag = usePaginacion(ventasOrdenadas, 10);

    // Encabezado clicable para ordenar (A-Z / Z-A, número, fecha)
    const ThOrden = ({ label, ordKey }) => (
        <th className="th-orden" onClick={() => alternarOrden(ordKey)} title="Ordenar">
            <span>{label}</span>
            <i className={`ti ${orden.key === ordKey
                ? (orden.dir === "asc" ? "ti-sort-ascending" : "ti-sort-descending")
                : "ti-arrows-sort"}`}></i>
        </th>
    );

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
        const etiqueta = esVip
            ? <><i className="ti ti-star"></i> VIP</>
            : <><i className="ti ti-armchair"></i> Normal</>;

        const boton = (a) => {
            // Al vender para varias personas, el asiento muestra a qué pasajero le tocó.
            const pos = elegidos.findIndex(e => e.numero === a.numero);
            return (
                <button
                    key={a.id}
                    className={`barco-asiento ${esVip ? "vip" : "normal"} ${!a.libreParaTramo ? "ocupado" : ""} ${pos >= 0 ? "seleccionado" : ""}`}
                    onClick={() => a.libreParaTramo && seleccionarAsiento(a)}
                    disabled={!a.libreParaTramo}
                    title={!a.libreParaTramo ? "Ocupado"
                        : pos >= 0 ? `Asiento de ${pasajeros[pos]?.pasajeroNombre || `pasajero ${pos + 1}`} — clic para soltarlo`
                        : `${esVip ? "VIP" : "Normal"} #${a.numero} — S/ ${precio}`}
                >
                    {a.numero}
                    {pos >= 0 && pasajeros.length > 1 && <span className="asiento-pax">P{pos + 1}</span>}
                </button>
            );
        };

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
                        <option value="sin-comprobante">Falta su comprobante</option>
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
                <button className="btn-limpiar" onClick={() => { setBusqueda(""); setFiltro("todos"); setFechaDesde(""); setFechaHasta(""); fetchVentas(); }}>
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
                            <ThOrden label="Pasajero" ordKey="pasajeroNombre" />
                            <th>Documento</th>
                            <th>Viaje</th>
                            <th>Tramo</th>
                            <ThOrden label="Asiento" ordKey="asientoNumero" />
                            <ThOrden label="Precio" ordKey="precio" />
                            <ThOrden label="Fecha" ordKey="fechaVenta" />
                            <th>Estado</th>
                            {puedeVender && <th>Acciones</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {pag.items.length === 0 ? (
                            <tr>
                                <td colSpan={puedeVender ? 10 : 9} className="tabla-vacia">
                                    <i className="ti ti-ticket-off"></i>
                                    {hayFiltros ? (
                                        <>
                                            <span>Ningún pasaje coincide con lo que buscas</span>
                                            <p className="vacio-ayuda">
                                                Prueba con otra fecha o quita los filtros para ver todo.
                                            </p>
                                            <button className="btn-limpiar" onClick={limpiarFiltros}>
                                                <i className="ti ti-filter-off"></i> Quitar filtros
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <span>Todavía no hay pasajes vendidos</span>
                                            <p className="vacio-ayuda">
                                                Acá aparece cada pasaje que vendas, con su boleto y su comprobante.
                                                {puedeVender && " Empieza por vender el primero."}
                                            </p>
                                            {puedeVender && (
                                                <button className="btn-nuevo" onClick={abrirModal}>
                                                    <i className="ti ti-plus"></i> Vender pasaje
                                                </button>
                                            )}
                                        </>
                                    )}
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
                                    <td data-label="Precio">
                                        <strong>S/ {v.precio}</strong>
                                        {v.lugarPago && (
                                            <><br /><span style={{ fontSize: "10px", color: "#6b7280" }}>
                                                <i className="ti ti-map-pin"></i> {v.lugarPago === "IQUITOS" ? "Iquitos" : "Requena"}
                                            </span></>
                                        )}
                                        {Number(v.descuento) > 0 && (
                                            <><br /><span style={{ fontSize: "10px", color: "#b45309" }}>
                                                rebaja S/ {v.descuento}
                                            </span></>
                                        )}
                                    </td>
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
                                                onClick={async () => avisarGuardado(mostrarToast, await generarComprobante(v), "Boleto", CARPETAS.BOLETOS)}
                                                title="Descargar ticket (80mm)"
                                            >
                                                <i className="ti ti-file-invoice"></i>
                                            </button>

                                            {/* Descargar ticket A4 */}
                                            <button
                                                className="btn-accion a4"
                                                onClick={async () => avisarGuardado(mostrarToast, await generarTicketA4(v), "Boleto A4", CARPETAS.BOLETOS)}
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
                                                comprobantePorVenta(v) ? (
                                                    <button
                                                        className="btn-accion emitido"
                                                        onClick={() => abrirComprobante(comprobantePorVenta(v))}
                                                        title={`Ver comprobante ${comprobantePorVenta(v).serie}-${String(comprobantePorVenta(v).numero).padStart(8, "0")}`}
                                                    >
                                                        <i className="ti ti-file-check"></i>
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="btn-accion generar"
                                                        onClick={() => setVentaParaComp(v)}
                                                        title={v.grupoVentaId
                                                            ? `Generar un comprobante por los ${grupoDe(v).length} pasajes de esta venta`
                                                            : "Generar boleta / factura electrónica"}
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
                                        <SelectorViaje
                                            viajes={viajes}
                                            value={form.viajeId}
                                            onChange={(id) => setForm(prev => ({ ...prev, viajeId: id }))}
                                        />
                                    </div>

                                    <div className="form-grupo">
                                        <label>¿Cuántas personas viajan? *</label>
                                        <div className="cantidad-pax">
                                            <button type="button" onClick={() => cambiarCantidad(pasajeros.length - 1)}
                                                    disabled={pasajeros.length <= 1} title="Quitar pasajero">
                                                <i className="ti ti-minus"></i>
                                            </button>
                                            <span className="cantidad-pax-valor">{pasajeros.length}</span>
                                            <button type="button" onClick={() => cambiarCantidad(pasajeros.length + 1)}
                                                    disabled={pasajeros.length >= MAX_PASAJEROS} title="Agregar pasajero">
                                                <i className="ti ti-plus"></i>
                                            </button>
                                            <span className="cantidad-pax-nota">
                                                {pasajeros.length === 1
                                                    ? "Un pasaje"
                                                    : `${pasajeros.length} pasajes en una sola venta, con un comprobante`}
                                            </span>
                                        </div>
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

                            {/* ── PASO 2: PASAJEROS ── */}
                            {paso === 2 && (
                                <div className="wizard-contenido">
                                    <p className="wizard-titulo">
                                        {pasajeros.length === 1 ? "Datos del pasajero" : `Datos de los ${pasajeros.length} pasajeros`}
                                    </p>

                                    {pasajeros.map((p, i) => (
                                        <div key={i} className={pasajeros.length > 1 ? "pax-bloque" : ""}>
                                            {pasajeros.length > 1 && (
                                                <p className="pax-titulo">
                                                    <i className="ti ti-user"></i> Pasajero {i + 1}
                                                    {p.pasajeroNombre && <span> — {p.pasajeroNombre}</span>}
                                                </p>
                                            )}
                                            <div className="form-fila">
                                                <div className="form-grupo">
                                                    <label>Tipo Documento *</label>
                                                    <select value={p.tipoDocumento}
                                                            onChange={e => cambiarPasajero(i, "tipoDocumento", e.target.value)}>
                                                        {TIPO_DOC.map(t => <option key={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                                <div className="form-grupo">
                                                    <label>Número Documento *</label>
                                                    <div className="doc-consulta">
                                                        <input type="text" value={p.pasajeroDocumento}
                                                               onChange={e => cambiarPasajero(i, "pasajeroDocumento", e.target.value)}
                                                               placeholder="12345678" />
                                                        {p.tipoDocumento === "DNI" && (
                                                            <button type="button" className="btn-consulta"
                                                                    onClick={() => consultarDniPasajero(i)}
                                                                    disabled={!/^\d{8}$/.test((p.pasajeroDocumento || "").trim()) || consultandoDni !== null}
                                                                    title="Consultar nombre (RENIEC)">
                                                                {consultandoDni === i
                                                                    ? <i className="ti ti-loader-2 spin"></i>
                                                                    : <i className="ti ti-search"></i>}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="form-grupo">
                                                <label>Nombre Completo *</label>
                                                <input type="text" value={p.pasajeroNombre}
                                                       onChange={e => cambiarPasajero(i, "pasajeroNombre", e.target.value)}
                                                       placeholder="Juan Pérez García" />
                                            </div>
                                            <div className="form-fila">
                                                <div className="form-grupo">
                                                    <label>Edad</label>
                                                    <input type="number" value={p.edad} min="0" max="120"
                                                           onChange={e => cambiarPasajero(i, "edad", e.target.value)}
                                                           placeholder="25" />
                                                </div>
                                                <div className="form-grupo">
                                                    <label>Sexo</label>
                                                    <select value={p.sexo}
                                                            onChange={e => cambiarPasajero(i, "sexo", e.target.value)}>
                                                        {SEXO.map(x => <option key={x}>{x}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="form-fila">
                                                <div className="form-grupo">
                                                    <label>Procedencia</label>
                                                    <input type="text" value={p.procedencia}
                                                           onChange={e => cambiarPasajero(i, "procedencia", e.target.value)}
                                                           placeholder="Lima" />
                                                </div>
                                                <div className="form-grupo">
                                                    <label>Teléfono</label>
                                                    <input type="text" value={p.pasajeroTelefono}
                                                           onChange={e => cambiarPasajero(i, "pasajeroTelefono", e.target.value)}
                                                           placeholder="999888777" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* El correo es uno solo: a ahí se mandan los boletos de toda la compra */}
                                    <div className="form-grupo">
                                        <label>Correo electrónico {pasajeros.length > 1 && "(se envían todos los boletos ahí)"}</label>
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
                                    <p className="wizard-titulo">
                                        {pasajeros.length === 1
                                            ? "Selecciona un asiento"
                                            : `Selecciona ${pasajeros.length} asientos (uno por pasajero)`}
                                    </p>

                                    {pasajeros.length > 1 && (
                                        <div className="pax-asientos">
                                            {pasajeros.map((p, i) => (
                                                <div key={i} className={`pax-asiento ${elegidos[i] ? "listo" : ""}`}>
                                                    <span className="pax-asiento-nombre">
                                                        P{i + 1} · {p.pasajeroNombre || "Pasajero " + (i + 1)}
                                                    </span>
                                                    <strong>
                                                        {elegidos[i]
                                                            ? `#${elegidos[i].numero} · ${elegidos[i].tipo}`
                                                            : "sin asiento"}
                                                    </strong>
                                                </div>
                                            ))}
                                        </div>
                                    )}

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

                                    <div className="proa-label"><i className="ti ti-arrow-up"></i> proa (adelante)</div>

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

                                    <div className="popa-label"><i className="ti ti-arrow-down"></i> popa (atrás)</div>

                                    {elegidos.length > 0 && (
                                        <div className="asiento-seleccionado-info">
                                            <i className="ti ti-check-circle" aria-hidden="true"></i>
                                            {elegidos.length === 1
                                                ? <>Asiento <strong>#{elegidos[0].numero}</strong> — {elegidos[0].tipo} — <strong>S/ {elegidos[0].precio}</strong></>
                                                : <>{elegidos.length} de {pasajeros.length} asientos: <strong>{elegidos.map(a => "#" + a.numero).join(", ")}</strong> — total <strong>S/ {totalCompra.toFixed(2)}</strong></>}
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

                                    {/* Precio a cobrar por pasajero (editable para rebajas) */}
                                    <div className="form-grupo">
                                        <label>Precio a cobrar (S/) *</label>
                                        {elegidos.map((a, i) => (
                                            <div key={a.numero} className="precio-fila">
                                                {pasajeros.length > 1 && (
                                                    <span className="precio-fila-quien">
                                                        {pasajeros[i]?.pasajeroNombre || `Pasajero ${i + 1}`} · #{a.numero}
                                                    </span>
                                                )}
                                                <input type="number" min="0" step="0.10"
                                                       value={a.precio}
                                                       onChange={e => cambiarPrecio(i, e.target.value)}
                                                       placeholder="0.00" />
                                                {a.precioOriginal !== "" && a.precioOriginal != null &&
                                                 parseFloat(a.precio) < parseFloat(a.precioOriginal) && (
                                                    <span className="precio-hint">
                                                        Tarifa S/ {a.precioOriginal} · rebaja S/ {
                                                            (parseFloat(a.precioOriginal) - (parseFloat(a.precio) || 0)).toFixed(2)
                                                        }
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="form-fila">
                                        <div className="form-grupo">
                                            <label>Lugar de pago *</label>
                                            <div className="comp-selector">
                                                {["IQUITOS", "REQUENA"].map(l => (
                                                    <button
                                                        key={l}
                                                        type="button"
                                                        className={`comp-btn ${form.lugarPago === l ? "activo" : ""}`}
                                                        onClick={() => setForm(prev => ({ ...prev, lugarPago: l }))}
                                                    >
                                                        {l === "IQUITOS" ? "Iquitos" : "Oficina Requena"}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Método de pago */}
                                    <div className="form-grupo">
                                        <label>Método de pago *</label>
                                        <div className="comp-selector metodo-selector">
                                            {METODOS_PAGO.map(m => (
                                                <button
                                                    key={m.key}
                                                    type="button"
                                                    className={`comp-btn ${form.metodoPago === m.key ? "activo" : ""}`}
                                                    onClick={() => setForm(prev => ({ ...prev, metodoPago: m.key }))}
                                                >
                                                    {m.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Observación */}
                                    <div className="form-grupo">
                                        <label>Observación (opcional)</label>
                                        <input type="text" name="observacion"
                                               value={form.observacion} onChange={handleChange}
                                               placeholder="Nota interna: pagó a medias, adelanto, etc." />
                                    </div>

                                    {/* Resumen final */}
                                    <div className="resumen-venta">
                                        <p className="resumen-titulo"><i className="ti ti-receipt"></i> Resumen de la venta</p>
                                        {pasajeros.map((p, i) => (
                                            <div className="resumen-fila" key={i}>
                                                <span>{pasajeros.length > 1 ? `Pasajero ${i + 1}` : "Pasajero"}</span>
                                                <strong>{p.pasajeroNombre} · #{elegidos[i]?.numero} · S/ {elegidos[i]?.precio}</strong>
                                            </div>
                                        ))}
                                        <div className="resumen-fila"><span>Viaje</span><strong>{viajeSeleccionado?.codigoViaje}</strong></div>
                                        <div className="resumen-fila"><span>Tramo</span><strong>{form.paradaOrigen} → {form.paradaDestino}</strong></div>
                                        {form.lugarPago && (
                                            <div className="resumen-fila"><span>Lugar de pago</span><strong>{form.lugarPago === "IQUITOS" ? "Iquitos" : "Oficina Requena"}</strong></div>
                                        )}
                                        {form.metodoPago && (
                                            <div className="resumen-fila"><span>Método de pago</span><strong>{METODOS_PAGO.find(m => m.key === form.metodoPago)?.label}</strong></div>
                                        )}
                                        {pasajeros.length > 1 && (
                                            <div className="resumen-fila"><span>Comprobante</span><strong>Uno solo por los {pasajeros.length} pasajes</strong></div>
                                        )}
                                        <div className="resumen-fila resumen-total"><span>Total</span><strong>S/ {totalCompra.toFixed(2)}</strong></div>
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
                                <button className="btn-guardar" disabled={avanzando} onClick={
                                    paso === 1 ? confirmarViaje :
                                        paso === 2 ? confirmarPasajero :
                                            paso === 3 ? confirmarTramo :
                                                confirmarAsiento
                                }>
                                    {avanzando
                                        ? <><i className="ti ti-loader-2 spin"></i> Cargando...</>
                                        : <>Siguiente <i className="ti ti-arrow-right"></i></>}
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
                    grupo={grupoDe(ventaParaComprobante)}
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