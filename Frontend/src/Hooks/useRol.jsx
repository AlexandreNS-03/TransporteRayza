export function useRol() {
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    const rol = usuario?.rol;

    return {
        rol,
        esAdmin:      rol === "ADMIN",
        esSupervisor: rol === "SUPERVISOR",
        esEmpleado:   rol === "EMPLEADO",
        puedeVer: (roles) => roles.includes(rol),
    };
}