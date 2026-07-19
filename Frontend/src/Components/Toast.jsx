import { useState, useCallback } from "react";
import "./Toast.css";

/**
 * Toasts de notificación (reemplazo de alert()).
 * Uso:
 *   const { toasts, mostrarToast } = useToast();
 *   mostrarToast("success", "Venta registrada");
 *   ...
 *   <Toasts toasts={toasts} />
 */
export function useToast() {
    const [toasts, setToasts] = useState([]);

    const mostrarToast = useCallback((tipo, mensaje) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, tipo, mensaje }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4500);
    }, []);

    return { toasts, mostrarToast };
}

const ICONOS = {
    success: "ti-circle-check",
    error:   "ti-alert-circle",
    info:    "ti-info-circle",
    warning: "ti-alert-triangle"
};

export function Toasts({ toasts }) {
    if (!toasts.length) return null;
    return (
        <div className="toasts-container">
            {toasts.map(t => (
                <div key={t.id} className={`toast toast-${t.tipo}`}>
                    <i className={`ti ${ICONOS[t.tipo] || ICONOS.info}`}></i>
                    <span>{t.mensaje}</span>
                </div>
            ))}
        </div>
    );
}
