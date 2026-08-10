import { Component } from "react";
import { reportarError } from "../services/errores";

/**
 * Red de seguridad de la web: si una pantalla revienta, en vez de dejar la página
 * en blanco muestra un aviso con salida y avisa al sistema.
 *
 * Tiene que ser una clase: React solo permite atrapar errores de renderizado así.
 */
export default class ErrorBoundary extends Component {
  state = { rompio: false };

  static getDerivedStateFromError() {
    return { rompio: true };
  }

  componentDidCatch(error, info) {
    reportarError(error?.message || "Error al mostrar la página",
                  `${error?.stack || ""}\n${info?.componentStack || ""}`);
  }

  render() {
    if (!this.state.rompio) return this.props.children;

    return (
      <div className="pantalla-error">
        <h1>Algo salió mal</h1>
        <p>
          No pudimos mostrar esta página. Ya avisamos al equipo; puedes intentar de
          nuevo o volver al inicio.
        </p>
        <div className="pantalla-error-acciones">
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Intentar de nuevo
          </button>
          <a className="btn btn-ghost" href="/">Ir al inicio</a>
        </div>
        <p className="pantalla-error-ayuda">
          Si necesitas comprar o consultar algo con urgencia, escríbenos al{" "}
          <a href="https://wa.me/51947012436">947 012 436</a>.
        </p>
      </div>
    );
  }
}
