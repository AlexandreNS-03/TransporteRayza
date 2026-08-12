import { useEffect, useRef } from "react";

/**
 * El único momento de movimiento con autoría de la portada.
 *
 * Al bajar, la foto del hero se desplaza más despacio que el texto y el buscador.
 * Eso da profundidad: la foto se lee como fondo y lo demás como algo que está
 * delante. No es adorno; es lo que hace que la página se sienta física en vez de
 * plana, y ocurre una sola vez, en el punto donde el visitante decide si sigue.
 *
 * Se usa GSAP y no CSS porque esto va atado a la posición del scroll, no al
 * tiempo: hay que poder ir y volver siguiendo el dedo. Las animaciones de scroll
 * nativas de CSS harían lo mismo, pero Safari todavía no las trae.
 *
 * GSAP se descarga aparte y solo cuando esta pantalla lo necesita: la carga
 * inicial de la web no lo paga.
 */
export default function HeroConProfundidad({ selector = ".hero-mb" }) {
    const limpiar = useRef(null);

    useEffect(() => {
        // Quien pidió menos movimiento no recibe ninguno, y tampoco la descarga.
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        // En pantallas chicas el hero ocupa casi todo: el desplazamiento se nota
        // como un salto en vez de como profundidad, así que no se aplica.
        if (window.matchMedia("(max-width: 860px)").matches) return;

        let vivo = true;

        (async () => {
            try {
                const [{ gsap }, { ScrollTrigger }] = await Promise.all([
                    import("gsap"),
                    import("gsap/ScrollTrigger"),
                ]);
                if (!vivo) return;

                gsap.registerPlugin(ScrollTrigger);
                const hero = document.querySelector(selector);
                const foto = hero?.querySelector(".carrusel");
                if (!hero || !foto) return;

                const contexto = gsap.context(() => {
                    gsap.to(foto, {
                        yPercent: 14,          // en porcentaje: no depende del alto real
                        ease: "none",          // atado al scroll, no al tiempo
                        scrollTrigger: {
                            trigger: hero,
                            start: "top top",
                            end: "bottom top",
                            scrub: 0.4,        // un pelo de retraso: se siente con peso
                            invalidateOnRefresh: true,
                        },
                    });
                }, hero);

                limpiar.current = () => contexto.revert();
            } catch (e) {
                // Si GSAP no llega, la portada queda quieta: no es motivo para
                // romper la página. Pero queda anotado, porque un fallo mudo es
                // imposible de diagnosticar después.
                console.warn("[Hero] no se pudo activar la profundidad:", e);
            }
        })();

        return () => {
            vivo = false;
            limpiar.current?.();
            limpiar.current = null;
        };
    }, [selector]);

    return null;
}
