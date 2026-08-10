import { Component } from "react";
import { reportarError } from "../Services/errores.js";

/**
 * Red de seguridad del sistema: si una pantalla revienta, en vez de dejar al
 * empleado frente a una página en blanco muestra un aviso con salida y manda el
 * error a Soporte.
 *
 * Tiene que ser una clase: React solo permite atrapar errores de renderizado así.
 */
export default class ErrorBoundary extends Component {
    state = { rompio: false };

    static getDerivedStateFromError() {
        return { rompio: true };
    }

    componentDidCatch(error, info) {
        reportarError(error?.message || "Error al mostrar la pantalla",
                      `${error?.stack || ""}\n${info?.componentStack || ""}`);
    }

    render() {
        if (!this.state.rompio) return this.props.children;

        return (
            <div className="pantalla-error">
                <i className="ti ti-alert-triangle"></i>
                <h2>Esta pantalla no se pudo mostrar</h2>
                <p>
                    Ya avisamos al equipo con el detalle. Puedes volver a intentarlo; si
                    sigue igual, usa otra pantalla mientras se resuelve y repórtalo desde
                    Soporte.
                </p>
                <div className="pantalla-error-acciones">
                    <button className="btn-primario" onClick={() => window.location.reload()}>
                        <i className="ti ti-refresh"></i> Intentar de nuevo
                    </button>
                    <a className="btn-secundario" href="/">Ir al inicio</a>
                </div>
            </div>
        );
    }
}
