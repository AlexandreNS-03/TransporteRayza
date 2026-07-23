import { Link } from "react-router-dom";

/**
 * Logo de la empresa, el mismo que usa el sistema de ventas, para que la web del
 * cliente y el mostrador se vean como la misma marca (antes había acá una lancha
 * dibujada a mano que no correspondía).
 *
 * Se usa logo-rayza-marca.png, que es el original ya recortado: el archivo grande
 * mide 736x1600 y el timón ocupa solo 463x478 en el centro, así que a 42px se veía
 * diminuto.
 */
export function LogoMark({ size = 42 }) {
  return (
    <img className="mark" src="/logo-rayza-marca.png" alt="" aria-hidden="true"
         width={size} height={size} style={{ objectFit: "contain" }} />
  );
}

export default function Logo({ to = "/" }) {
  return (
    <Link className="logo" to={to} aria-label="Transportes Rayza — inicio">
      <LogoMark />
      <span className="txt">
        <b>Transportes <span>Rayza</span></b>
        <small>Amazonía · Perú</small>
      </span>
    </Link>
  );
}
