import { alternarTema, useTema } from "../Utils/tema.js";

/* El interruptor de día/noche. Dice a qué se va a cambiar, no en qué está:
   quien lo mira de reojo entre dos clientes necesita saber qué pasa si lo
   toca, no que le confirmen lo que ya está viendo. */
function BotonTema() {
    const tema = useTema();
    const aOscuro = tema !== "oscuro";

    return (
        <button
            type="button"
            className="tema-btn"
            onClick={alternarTema}
            title={aOscuro ? "Cambiar a modo noche" : "Cambiar a modo día"}
            aria-label={aOscuro ? "Cambiar a modo noche" : "Cambiar a modo día"}
        >
            <i className={aOscuro ? "ti ti-moon" : "ti ti-sun"}></i>
        </button>
    );
}

export default BotonTema;
