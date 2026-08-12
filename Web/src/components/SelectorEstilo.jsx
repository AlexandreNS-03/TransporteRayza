import { useState, useEffect } from "react";
import "./SelectorEstilo.css";

/**
 * Banco de pruebas de estilos de la portada.
 *
 * Permite comparar en vivo tres direcciones visuales completas sobre el
 * contenido de verdad, que es la única forma honesta de elegir una: en una
 * maqueta con texto de relleno todo se ve bien.
 *
 * Solo aparece entrando con ?estilos=1. Sin ese parámetro no se monta, no carga
 * su hoja de estilos y el visitante común no se entera de que existe. Es una
 * herramienta para decidir, no una función del producto.
 */

const ESTILOS = [
    { id: "",             nombre: "Actual",       pista: "Lo que está publicado hoy" },
    { id: "suave",        nombre: "Suave",        pista: "Redondo, cálido, sombras difusas" },
    { id: "minimalista",  nombre: "Minimalista",  pista: "Sin sombras, línea de 1px, mucho blanco" },
    { id: "brutalista",   nombre: "Brutalista",   pista: "Trazo grueso, mayúsculas, datos en mono" },
];

export default function SelectorEstilo() {
    const [activo, setActivo] = useState(() => localStorage.getItem("lab.estilo") || "");
    const [abierto, setAbierto] = useState(true);

    useEffect(() => {
        // La hoja se pide solo cuando el banco de pruebas está en uso.
        import("../estilos/estilos.css");
    }, []);

    useEffect(() => {
        const raiz = document.documentElement;
        if (activo) raiz.setAttribute("data-estilo", activo);
        else raiz.removeAttribute("data-estilo");
        localStorage.setItem("lab.estilo", activo);
        return () => raiz.removeAttribute("data-estilo");
    }, [activo]);

    if (!abierto) {
        return (
            <button className="lab-abrir" onClick={() => setAbierto(true)} title="Probar estilos">
                Estilos
            </button>
        );
    }

    return (
        <aside className="lab-estilos" aria-label="Banco de pruebas de estilos">
            <div className="lab-cabecera">
                <strong>Probando estilos</strong>
                <button onClick={() => setAbierto(false)} aria-label="Ocultar">×</button>
            </div>

            <div className="lab-opciones">
                {ESTILOS.map(e => (
                    <button
                        key={e.id || "actual"}
                        className={`lab-opcion ${activo === e.id ? "activa" : ""}`}
                        onClick={() => setActivo(e.id)}
                    >
                        <span className="lab-nombre">{e.nombre}</span>
                        <span className="lab-pista">{e.pista}</span>
                    </button>
                ))}
            </div>

            <p className="lab-nota">
                Solo se ve entrando con <code>?estilos=1</code>. Los clientes siguen viendo
                el estilo actual.
            </p>
        </aside>
    );
}
