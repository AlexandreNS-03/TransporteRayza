import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./AvisoComprobantes.css";
import { apiFetch, usuarioActual } from "../Services/api.js";

/**
 * Recordatorio de boletas y facturas que quedaron sin emitir.
 *
 * El comprobante electrónico se emite en un segundo paso y en el mostrador es fácil
 * que quede para después: el pasajero ya se fue con su ticket y nada en pantalla
 * recuerda que falta. Este aviso aparece al entrar, agrupado por fecha de viaje,
 * que es como el personal ubica su trabajo.
 *
 * Sale UNA vez al día por usuario. Un aviso que salta a cada rato se cierra sin
 * leer, y entonces deja de servir para lo único que existe.
 */

/** Etiqueta del día en palabras, igual que en el resto del sistema. */
function etiquetaDia(iso) {
    if (!iso) return "Sin fecha";
    const hoy  = new Date().toLocaleDateString("en-CA");
    const ayer = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");
    if (iso === hoy)  return "Hoy";
    if (iso === ayer) return "Ayer";
    const [a, m, d] = iso.split("-").map(Number);
    const f = new Date(a, m - 1, d);
    const txt = f.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
    return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export default function AvisoComprobantes() {
    const [datos, setDatos]     = useState(null);
    const [visible, setVisible] = useState(false);
    const navegar  = useNavigate();
    const ubicacion = useLocation();
    const usuario  = usuarioActual();

    // La marca lleva el usuario y el día: si se turnan en la misma máquina, cada
    // uno ve su aviso.
    const clave = `aviso.comprobantes.${usuario?.username || "?"}.${new Date().toLocaleDateString("en-CA")}`;

    useEffect(() => {
        if (localStorage.getItem(clave)) return;
        apiFetch("/api/comprobantes/pendientes")
            .then(d => {
                if (!d || !d.total) return;
                setDatos(d);
                setVisible(true);
            })
            .catch(() => { /* si falla, no se molesta a nadie con un error de un recordatorio */ });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cerrar = () => {
        localStorage.setItem(clave, "1");
        setVisible(false);
    };

    const irAPasajes = () => {
        cerrar();
        // La primera parte de la ruta dice el panel: /admin, /supervisor o /empleado.
        const panel = ubicacion.pathname.split("/")[1] || "admin";
        navegar(`/${panel}/pasajes?pendientes=1`);
    };

    const soles = (n) => `S/ ${Number(n || 0).toFixed(2)}`;

    if (!visible || !datos) return null;

    return (
        <div className="aviso-overlay" onClick={cerrar}>
            <div className="aviso-caja" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">

                <div className="aviso-cabecera">
                    <i className="ti ti-file-alert"></i>
                    <div>
                        <h3>Faltan comprobantes por emitir</h3>
                        <p>
                            {datos.total === 1
                                ? "Hay 1 venta cobrada sin su comprobante emitido."
                                : `Hay ${datos.total} ventas cobradas sin su comprobante emitido.`}
                            {datos.montoTotal != null && ` Suman ${soles(datos.montoTotal)}.`}
                        </p>
                    </div>
                </div>

                <div className="aviso-fechas">
                    {datos.porFecha.map(f => (
                        <div className="aviso-fecha" key={f.fecha}>
                            <div className="aviso-fecha-dia">
                                <strong>{etiquetaDia(f.fecha)}</strong>
                                <span>{f.fecha}</span>
                            </div>
                            <div className="aviso-fecha-datos">
                                <span className="aviso-cantidad">
                                    {f.cantidad} {f.cantidad === 1 ? "pendiente" : "pendientes"}
                                </span>
                                <span className="aviso-monto">{soles(f.monto)}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="aviso-nota">
                    Son ventas de tu oficina.
                    {datos.fechasOcultas > 0 &&
                        ` Se muestran las ${datos.porFecha.length} fechas más recientes; hay ${datos.fechasOcultas} día(s) más con pendientes.`}
                </p>

                <div className="aviso-acciones">
                    <button className="aviso-btn-secundario" onClick={cerrar}>Ahora no</button>
                    <button className="aviso-btn-principal" onClick={irAPasajes}>
                        <i className="ti ti-receipt-2"></i> Emitirlos ahora
                    </button>
                </div>

                <p className="aviso-pie">Este recordatorio aparece una vez al día.</p>
            </div>
        </div>
    );
}
