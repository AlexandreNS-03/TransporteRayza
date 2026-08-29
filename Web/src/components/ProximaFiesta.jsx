import { Link } from "react-router-dom";
import { EMPRESA } from "../datos";
import { IconConfetti, IconMusic, IconBoat, IconFood, IconMapPin } from "./Icons";

/**
 * La próxima fiesta del río.
 *
 * Antes esta sección anunciaba únicamente el aniversario de Requena, con las
 * fechas escritas a mano y sin condición: siguió invitando a una fiesta que ya
 * había terminado, y bajarla dependía de que alguien se acordara.
 *
 * Ahora la sección se calcula: de un calendario de fiestas reales de la zona se
 * toma la que viene, y cuando pasa se pasa sola a la siguiente. En cuanto una
 * fiesta empieza, se anuncia como "es ahora" hasta que termina.
 */

/**
 * Fiestas de los puertos que atendemos. `desde` y `hasta` en MM-DD; para las de
 * un solo día, ambas iguales. Son las mismas que figuran en cada destino.
 */
const FIESTAS = [
  {
    nombre: "Aniversario de Nauta", lugar: "Nauta, Loreto", destino: "Nauta",
    desde: "04-30", hasta: "04-30", cuando: "30 de abril",
    frase: "Nauta celebra su fundación a orillas del Marañón.",
    actividades: ["Desfile cívico", "Música y danzas", "Feria y gastronomía"],
  },
  {
    nombre: "Fiesta de San Juan", lugar: "Toda la Amazonía", destino: "",
    desde: "06-22", hasta: "06-24", cuando: "24 de junio",
    frase: "La fiesta más grande de la selva: juanes, purtumute y baño bendito en el río.",
    actividades: ["Baño de San Juan", "Juanes y comida típica", "Danzas y pandilla"],
  },
  {
    nombre: "Feria Agropecuaria y Artesanal", lugar: "Requena, Loreto", destino: "Requena",
    desde: "07-27", hasta: "07-29", cuando: "27 al 29 de julio",
    frase: "Lo que da la tierra y el río, en una sola feria por Fiestas Patrias.",
    actividades: ["Feria agropecuaria", "Artesanía local", "Gastronomía"],
  },
  {
    nombre: "Aniversario de Requena", lugar: "Requena, Loreto", destino: "Requena",
    desde: "08-18", hasta: "08-23", cuando: "18 al 23 de agosto",
    frase: "La Atenas del Ucayali celebra su aniversario a orillas del río.",
    actividades: ["Desfiles cívicos", "Música y danzas", "Fiesta en el río", "Feria y gastronomía"],
  },
  {
    nombre: "Virgen de la Natividad", lugar: "Jenaro Herrera, Loreto", destino: "Jenaro Herra",
    desde: "09-06", hasta: "09-08", cuando: "8 de septiembre",
    frase: "Procesión y fiesta patronal en el corazón del Ucayali.",
    actividades: ["Procesión", "Misa de fiesta", "Comida comunal"],
  },
];

const dosDigitos = (n) => String(n).padStart(2, "0");

/**
 * La fiesta que toca anunciar hoy.
 *
 * Si alguna está ocurriendo, esa manda. Si no, la siguiente del año; y pasado
 * diciembre se vuelve a la primera, para que en enero no quede vacío.
 */
export function fiestaDeHoy(hoy = new Date()) {
  const md = `${dosDigitos(hoy.getMonth() + 1)}-${dosDigitos(hoy.getDate())}`;

  const enCurso = FIESTAS.find((f) => md >= f.desde && md <= f.hasta);
  if (enCurso) return { ...enCurso, esAhora: true };

  const siguiente = FIESTAS.find((f) => f.desde > md) || FIESTAS[0];
  return { ...siguiente, esAhora: false };
}

const ICONOS = [IconConfetti, IconMusic, IconBoat, IconFood];

export default function ProximaFiesta() {
  const f = fiestaDeHoy();
  const [mes, dia] = f.desde.split("-");
  const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

  return (
    <section className="section aniversario-sec" id="fiestas">
      <div className="wrap">
        <div className="section-head">
          <div className="kicker">{f.esAhora ? "Está pasando ahora" : "Lo que viene en el río"}</div>
          <h2>{f.esAhora ? `¡${f.lugar.split(",")[0]} está de fiesta!` : "La próxima fiesta del río"}</h2>
          <p>
            {f.frase} Viaja con Transportes Rayza y sé parte de la fiesta.
          </p>
        </div>

        <div className="aniversario-card">
          <div className="aniversario-borde">
            <span className="aniversario-kicker">
              {f.esAhora ? "Te esperamos" : "Anota la fecha"}
            </span>
            <div className="aniversario-numero">
              {Number(dia)}<sup>{MESES[Number(mes) - 1]}</sup>
            </div>
            <h3 className="aniversario-titulo">{f.nombre}</h3>
            <p className="aniversario-sub">{f.cuando}</p>

            <div className="aniversario-iconos">
              {f.actividades.map((a, i) => {
                const Ico = ICONOS[i % ICONOS.length];
                return (
                  <span key={a}>
                    <Ico width={16} height={16} style={{ verticalAlign: "-3px" }} /> {a}
                  </span>
                );
              })}
            </div>

            <p className="aniversario-lugar">
              <IconMapPin width={14} height={14} style={{ verticalAlign: "-2px" }} /> {f.lugar}
            </p>
          </div>
        </div>

        <div className="aniversario-acciones">
          <Link className="btn btn-primary" to={f.destino ? `/comprar?destino=${encodeURIComponent(f.destino)}` : "/comprar"}>
            {f.destino ? `Viaja a ${f.destino}` : "Buscar viajes"}
          </Link>
          <a className="btn btn-ghost" href={EMPRESA.redes.facebook} target="_blank" rel="noopener">
            Ver en Facebook
          </a>
        </div>
      </div>
    </section>
  );
}
