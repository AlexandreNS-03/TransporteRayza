import { useState } from "react";
import "./Paginacion.css";

/**
 * Paginación en cliente.
 * Uso:
 *   const pag = usePaginacion(listaFiltrada, 10);
 *   pag.items.map(...)
 *   <Paginacion {...pag} />
 */
export function usePaginacion(lista, porPagina = 10) {
    const [pagina, setPagina] = useState(1);
    const total        = lista.length;
    const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
    const paginaActual = Math.min(pagina, totalPaginas);
    const items        = lista.slice((paginaActual - 1) * porPagina, paginaActual * porPagina);
    return { items, paginaActual, totalPaginas, total, porPagina, setPagina };
}

export function Paginacion({ paginaActual, totalPaginas, total, porPagina, setPagina }) {
    if (total <= porPagina) return null;

    const desde = (paginaActual - 1) * porPagina + 1;
    const hasta = Math.min(paginaActual * porPagina, total);

    return (
        <div className="paginacion">
            <span className="paginacion-info">{desde}–{hasta} de {total}</span>
            <div className="paginacion-controles">
                <button disabled={paginaActual === 1} onClick={() => setPagina(1)} title="Primera página">
                    <i className="ti ti-chevrons-left"></i>
                </button>
                <button disabled={paginaActual === 1} onClick={() => setPagina(paginaActual - 1)} title="Anterior">
                    <i className="ti ti-chevron-left"></i>
                </button>
                <span className="paginacion-actual">{paginaActual} / {totalPaginas}</span>
                <button disabled={paginaActual === totalPaginas} onClick={() => setPagina(paginaActual + 1)} title="Siguiente">
                    <i className="ti ti-chevron-right"></i>
                </button>
                <button disabled={paginaActual === totalPaginas} onClick={() => setPagina(totalPaginas)} title="Última página">
                    <i className="ti ti-chevrons-right"></i>
                </button>
            </div>
        </div>
    );
}
