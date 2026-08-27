/**
 * Módulo de pacientes
 * --------------------
 * Agrupa la lógica de búsqueda, validación y normalización de pacientes.
 *
 * Este archivo se creó para separar parte del código que antes estaba mezclado
 * dentro de main.js, manteniendo el mismo dominio de negocio en un lugar claro.
 */

window.LaboratorioModules = window.LaboratorioModules || {};
window.LaboratorioModules.pacientes = window.LaboratorioModules.pacientes || {};

window.LaboratorioModules.pacientes.parsearNombrePaciente = function parsearNombrePaciente(texto) {
    const valor = String(texto || "").trim();
    if (!valor) return { nombre: "", apellidoPaterno: "", apellidoMaterno: "" };

    const palabras = valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean);

    if (!palabras.length) return { nombre: "", apellidoPaterno: "", apellidoMaterno: "" };
    if (palabras.length === 1) return { nombre: palabras[0], apellidoPaterno: "", apellidoMaterno: "" };
    if (palabras.length === 2) return { nombre: palabras[0], apellidoPaterno: palabras[1], apellidoMaterno: "" };
    if (palabras.length === 3) return { nombre: palabras[0], apellidoPaterno: palabras[1], apellidoMaterno: palabras[2] };

    return {
        nombre: `${palabras[0]} ${palabras[1]}`,
        apellidoPaterno: palabras[2],
        apellidoMaterno: palabras[3]
    };
};

window.LaboratorioModules.pacientes.normalizarTextoPaciente = function normalizarTextoPaciente(valor) {
    return normalizarTexto(String(valor || "").trim());
};

window.LaboratorioModules.pacientes.clavePaciente = function clavePaciente(paciente) {
    const nombre = normalizarValorPaciente(paciente?.nombre || "");
    const apellidoP = normalizarValorPaciente(paciente?.apellidoPaterno || "");
    const apellidoM = normalizarValorPaciente(paciente?.apellidoMaterno || "");
    const fecha = normalizarValorPaciente(paciente?.fechaNacimiento || "");
    const telefono = normalizarValorPaciente(paciente?.telefono || "");
    return `${nombre}|${apellidoP}|${apellidoM}|${fecha}|${telefono}`;
};

window.LaboratorioModules.pacientes.buscarPacienteEnLista = function buscarPacienteEnLista(filtro, pacientesListado) {
    const criterio = normalizarTexto(String(filtro || "").trim());
    if (!criterio) return [];

    return (pacientesListado || []).filter((paciente) => {
        const nombreCompleto = `${paciente.nombre ?? ""} ${paciente.apellidoPaterno ?? ""} ${paciente.apellidoMaterno ?? ""}`.trim();
        return normalizarTexto(nombreCompleto).includes(criterio) || normalizarTexto(String(paciente.telefono || "")).includes(criterio);
    });
};
